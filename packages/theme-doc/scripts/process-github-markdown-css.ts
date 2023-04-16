import postcss from 'postcss'
import fs from 'fs-extra'
import parser from 'postcss-selector-parser'
import type { Node as SelectorNode } from 'postcss-selector-parser'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const cssPath = require.resolve('github-markdown-css/github-markdown-light.css')

const css = fs.readFileSync(cssPath, 'utf-8')

// github-markdown-css normally applies to .markdown-body and ALL its descendants.
// But user custom components and demo component may also be rendered inside .markdown-body. We don't want github-markdown-css affects them.
// So we use this script to preprocess github-markdown-css to make it scoped inside "markdown element"（.e.g "p" or "ul").

postcss([
  {
    postcssPlugin: 'postcss-github-markdown-css',
    Rule(rule, helper) {
      parser((selectors) => {
        selectors.each((selector) => {
          const first = selector.first
          const second = first.next()
          if (
            first.type === 'class' &&
            first.value === 'markdown-body' &&
            second?.type === 'combinator' &&
            second.value === ' '
          ) {
            // apply the rule to .markdown-el, as well as descendants of it
            // replace .markdown-body xxxx yyyy
            // with xxxx:is(.markdown-el, .markdown-el *) yyyy
            const groups = selector.split((selector) => {
              return selector.type === 'combinator'
            })

            // remove the ".markdown-body " part
            groups.shift()

            // now the groups[0] is the "xxxx " part

            // add the :is(.markdown-el, .markdown-el *) part
            const newNode = parser.pseudo({
              value: ':is(.markdown-el, .markdown-el *)',
            })

            const index = findPseudoInsertPosition(groups[0])
            groups[0].splice(index, 0, newNode)

            selector.nodes = groups.flat()
          }
        })
      }).processSync(rule, { updateSelector: true })
    },
  },
])
  .process(css, { from: 'github-markdown-light.css', to: 'out.css' })
  .then((result) => {
    fs.writeFileSync(
      new URL('../src/Layout/github-markdown-light.css', import.meta.url),
      `/* This file is generated by ../../scripts/process-github-markdown-css.ts. Don't Edit this file directly. */\n` +
        result.css
    )
  })

/**
 * Insert pseudo selector after type selector and universal selector, before combinator and other pseudo.
 * https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors#structure_of_a_selector
 */
function findPseudoInsertPosition(nodes: SelectorNode[]) {
  let insertIndex = 0
  while (insertIndex < nodes.length) {
    if (
      nodes[insertIndex].type === 'combinator' ||
      nodes[insertIndex].type === 'pseudo'
    ) {
      break
    }
    insertIndex++
  }
  return insertIndex
}
