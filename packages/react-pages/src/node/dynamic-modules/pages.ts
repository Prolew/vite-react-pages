import slash from 'slash'

export interface PagesData {
  [pageId: string]: {
    data: {
      [key: string]: string
    }
    staticData: {
      [key: string]: any
    }
  }
}

export async function renderPageList(pagesData: PagesData) {
  const addPagesData = Object.entries(pagesData).map(
    ([pageId, { staticData }]) => {
      let subPath = pageId
      if (subPath === '/') {
        // import("@!virtual-modules/pages/") would make vite confused
        // so we change the sub path
        subPath = '/__index'
      }
      const code = `
pages["${pageId}"] = {};
pages["${pageId}"].data = () => import("@!virtual-modules/pages${subPath}");
pages["${pageId}"].staticData = ${JSON.stringify(staticData)};`
      return code
    }
  )
  return `
const pages = {};
${addPagesData.join('\n')}
export default pages;
`
}

export async function renderPageListInSSR(pagesData: PagesData) {
  const addPagesData = Object.entries(pagesData).map(
    ([pageId, { staticData }], index) => {
      let subPath = pageId
      if (subPath === '/') {
        // import("@!virtual-modules/pages/") would make vite confused
        // so we change the sub path
        subPath = '/__index'
      }
      const code = `
pages["${pageId}"] = {};
import page${index} from "@!virtual-modules/pages${subPath}";
pages["${pageId}"] = page${index};`
      return code
    }
  )
  return `
const pages = {};
${addPagesData.join('\n')}
export default pages;
`
}

export function renderOnePageData(onePageData: { [dataKey: string]: string }) {
  const importModule = Object.entries(onePageData).map(
    ([dataKey, path], idx) => `
import * as m${idx} from "${slash(path)}";
modules["${dataKey}"] = m${idx};`
  )
  return `
  const modules = {};
  ${importModule.join('\n')}
  export default modules;`
}
