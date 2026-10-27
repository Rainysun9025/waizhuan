import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 把 vite 构建产物内联成单个 index.html：
 * 这样 file:// 双击就能打开（浏览器会拦截 file:// 下的外部 module 脚本），
 * 整个网站就是一个文件，拷走、发给别人都能直接用。
 */
const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const htmlPath = join(dist, 'index.html')
let html = readFileSync(htmlPath, 'utf8')

const jsMatch = html.match(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"[^>]*><\/script>/)
if (!jsMatch) throw new Error('no external module script found in dist/index.html')
let js = readFileSync(join(dist, jsMatch[1]), 'utf8')
js = js.replace(/<\/script/gi, '<\\/script')
html = html.replace(jsMatch[0], () => `<script type="module">\n${js}\n</script>`)

const cssMatch = html.match(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/)
if (cssMatch) {
  const css = readFileSync(join(dist, cssMatch[1]), 'utf8')
  html = html.replace(cssMatch[0], () => `<style>\n${css}\n</style>`)
}

writeFileSync(htmlPath, html)
console.log(`single-file OK: ${(html.length / 1024).toFixed(0)} KB -> dist/index.html`)
