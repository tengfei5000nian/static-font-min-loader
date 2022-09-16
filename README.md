# fontmin loader for webpack

一个webpack的loader，用来压缩生成字体。

> NOTE: Node v10+ and webpack v4+ are supported and tested.


## 关于

读取指定文件文本，使用fontmin压缩用到的字体。


## 安装

`npm install --save-dev static-font-min-loader`


## 使用

```js
const webpackConfig = {
    module: {
        rules: [
            {
                test: /\.(otf|ttf|svg|svgs|eot|woff|woff2)(\?.*)?$/,
                generator: {
                    filename: '[name].[hash:8][ext]'
                },
                loader: 'static-font-min-loader'
            }
        ]
    }
}

module.exports = webpackConfig
```

```css
@font-face {
    font-family: 'source';
    src:
        url('../font/source.ttf?to=eot') format('embedded-opentype'),
        url('../font/source.ttf?to=woff2') format('woff2'),
        url('../font/source.ttf?to=woff') format('woff'),
        url('../font/source.ttf?to=svg') format('svg'),
        url('../font/source.ttf') format('truetype');
}
```

在source.ttf的文件夹中创建source.txt文本文件，里面包含需要用到的字体。


## 选项

```js
{
    // 包含需要切割的文本的文件, 如果include、exclude存在，links失效。
    //
    // type: array|string
    // default: loaderContext.resourcePath.replace(/\.([\w\d]+)$/, '.txt')
    links: [],

    // 包含的文件。
    //
    // type: RegExp?
    include: null,

    // 排除的文件
    //
    // type: RegExp?
    exclude: null,

    // 文本过滤。
    //
    // type: function(text: string): string
    filter: text => text
}
```
