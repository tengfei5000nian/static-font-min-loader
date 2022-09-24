import Path from 'path'
import Fontmin from 'fontmin'
import fileLoader from 'file-loader'
import SchemaUtils from 'schema-utils'

import options from './options.json'

const loaderName = 'static-font-min-loader'

function getExt() {
  const fromRes = this.resourcePath.match(/\.([\w\d]+)$/)
  const fromKey = fromRes && fromRes[1]

  const toRes = this.resourceQuery.match(/to\=([\w\d]+)/)
  const toKey = toRes && toRes[1]

  return {
    from: fromKey,
    to: toKey || fromKey
  }
}

function getQuery() {
  const query = Object.assign({
    links: this.resourcePath.replace(/\.([\w\d]+)$/, '.txt'),
    include: null,
    exclude: null,
    filter: text => text,
    fileLoaderOptions: {}
  }, this.query)

  SchemaUtils.validate(options, query)

  return query
}

async function getText(query) {
  const paths = query.include || query.exclude
    ? Object.keys(await findFiles(this.fs, this.rootContext, { include: query.include, exclude: query.exclude }))
    : (Array.isArray(query.links) ? query.links : [query.links])
  const texts = await Promise.all(
    paths.map(async path => {
      this.addDependency(path)
      return callbackAsync.call(this.fs, 'readFile', path, {
        encoding: 'utf8'
      })
    })
  )
  const text = texts.map(([t]) => t).join('')
  return text
}

async function callbackAsync(name, ...args) {
  return new Promise((resolve, reject) => {
    this[name](...args, (err, ...result) => {
      err ? reject(err) : resolve(result)
    })
  })
}

async function findFiles(fs, path, options) {
  options = Object.assign({
    include: null,
    exclude: null,
    ignoreDot: true,
    ignoreDir: true,
    ignoreEmptyDir: true,
    ignoreUnreadableDir: true,
    ignoreChildren: false,
    ignoreFile: false
  }, options)
  options.filter = (options.filter || pathFilter).bind(options)

  const fileList = {}

  try {
    const [stat] = await callbackAsync.call(fs, 'stat', path)

    if (stat.isDirectory()) {
      const [files] = await callbackAsync.call(fs, 'readdir', path)
      const state = options.filter(path, stat, !!files.length)

      if ([0, 3].includes(state)) fileList[path] = stat

      if ([0, 2].includes(state)) await Promise.all(
        files.map(async file => {
          const filePath = Path.join(path, file)
          Object.assign(fileList, await findFiles(fs, filePath, options))
        })
      )
    } else if (options.filter(path, stat, false) === 0) {
      fileList[path] = stat
    }
  } catch (err) {
    if (err.code === 'EACCES' && options.ignoreUnreadableDir) return fileList
    throw err
  }

  return fileList
}

export const raw = true

export default async function (content, map, meta) {
  const callback = this.async()
  try {
    const query = getQuery.call(this)
    const text = await getText.call(this, query)

    const ext = getExt.call(this)
    const key = `${ext.from}2${ext.to}`
    const fontmin = new Fontmin()
    fontmin.src(content)

    fontmin.use(
      Fontmin.glyph({
        text: query.filter(text)
      })
    )

    switch (key) {
      case 'otf2otf':
      case 'ttf2ttf':
      case 'svg2svg':
      case 'svgs2svgs':
      case 'eot2eot':
      case 'woff2woff':
      case 'woff22woff2':
        break;
      case 'otf2ttf':
        fontmin.use(Fontmin.otf2ttf({
          clone: true
        }))
        break;
      case 'svg2ttf':
        fontmin.use(Fontmin.svg2ttf({
          clone: true
        }))
        break;
      case 'svgs2ttf':
        fontmin.use(Fontmin.svgs2ttf({
          clone: true
        }))
        break;
      case 'ttf2eot':
        fontmin.use(Fontmin.ttf2eot({
          clone: true
        }))
        break;
      case 'ttf2svg':
        fontmin.use(Fontmin.ttf2svg({
          clone: true
        }))
        break;
      case 'ttf2woff':
        fontmin.use(Fontmin.ttf2woff({
          clone: true
        }))
        break;
      case 'ttf2woff2':
        fontmin.use(Fontmin.ttf2woff2({
          clone: true
        }))
        break;
      default:
        throw new Error(`无法进行转换：${this.resource}`)
    }

    const [files] = await callbackAsync.call(fontmin, 'run')
    const file = files[files.length - 1]
    const data = file._contents

    const fileLoaderContext = Object.assign({}, this, {
      query: this.query.fileLoaderOptions || {},
      resource: this.resource.replace(`.${ext.from}`, `.${ext.to}`),
      resourcePath: this.resourcePath.replace(`.${ext.from}`, `.${ext.to}`)
    })
    const exportPath = fileLoader.call(fileLoaderContext, data, map, meta)

    callback(null, exportPath, map, meta)
  } catch (err) {
    callback(err, '', map, meta)
  }
}
