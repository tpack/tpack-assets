﻿
var Path = require('path');
var Lang = require('tealweb/lang');
var IO = require('tealweb/io');

// #region 导出

/**
 * TPack 解析文件依赖的插件。
 * @param {BuildFile} file 当前正在编译的文件。
 * @param {Object} options 用户设置的传递给当前插件的选项。具体的配置值为：
 * * @property {Boolean} [resolveComments=true] 是否解析注释内的 #include 等指令。
 * * @property {Boolean} [resolveCommonJsRequires=true] 是否解析 CommonJs require 调用。
 * * @property {Boolean} [resolveAsyncRequires=true] 是否解析 AMD 异步 require 调用。
 * * @property {Boolean} [resolveCommonJsExports=true] 是否解析 CommonJs module/exports 指令。
 * * @property {Boolean} [resolveUrls=true] 是否解析 ?__url 指令。
 * * @property {Function} [importer] 自定义导入路径的函数。
 * @param {Builder} builder 当前正在使用的构建器。
 * @returns {String|Undefined} 返回新文件或新文件内容。
 */
module.exports = exports = function (file, options, builder) {
    exports.process(file, exports.resolveModule, options, builder);
};

/**
 * TPack 解析 HTML 模块内容的插件。
 * @param {BuildFile} file 当前正在编译的文件。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @param {Builder} builder 当前正在使用的构建器。
 * @returns {String|Undefined} 返回新文件或新文件内容。
 */
exports.html = function (file, options, builder) {
    exports.process(file, exports.resolveHtmlModule, options, builder);
};

/**
 * TPack 解析 CSS 模块内容的插件。
 * @param {BuildFile} file 当前正在编译的文件。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @param {Builder} builder 当前正在使用的构建器。
 * @returns {String|Undefined} 返回新文件或新文件内容。
 */
exports.css = function (file, options, builder) {
    exports.process(file, exports.resolveCssModule, options, builder);
};

/**
 * TPack 解析 JS 模块内容的插件。
 * @param {BuildFile} file 当前正在编译的文件。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @param {Builder} builder 当前正在使用的构建器。
 * @returns {String|Undefined} 返回新文件或新文件内容。
 */
exports.js = function (file, options, builder) {
    exports.process(file, exports.resolveJsModule, options, builder);
};

/**
 * TPack 解析文本模块内容的插件。
 * @param {BuildFile} file 当前正在编译的文件。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @param {Builder} builder 当前正在使用的构建器。
 * @returns {String|Undefined} 返回新文件或新文件内容。
 */
exports.text = function (file, options, builder) {
    exports.process(file, exports.resolveTextModule, options, builder);
};

/**
 * TPack 解析资源模块内容的插件。
 * @param {BuildFile} file 当前正在编译的文件。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @param {Builder} builder 当前正在使用的构建器。
 * @returns {String|Undefined} 返回新文件或新文件内容。
 */
exports.resource = function (file, options, builder) {
    exports.process(file, exports.resolveResourceModule, options, builder);
};

/**
 * 使用指定的模块解析器处理指定文件。
 * @param {BuildFile} file 当前正在编译的文件。
 * @param {Function} resolver 解析当前模块的解析器。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @param {Builder} builder 当前正在使用的构建器。
 * @returns {String|Undefined} 返回新文件或新文件内容。
 * @returns {String|Undefined} 返回新文件或新文件内容。
 */
exports.process = function(file, resolver, options, builder) {
    var result = exports.getModule(file, resolver, options, builder).pack(options);
    if (result != null) {
        file.content = result;
    }
};

/**
 * 获取和文件关联的模块。
 * @param {BuildFile} file 当前正在编译的文件。
 * @param {Function} resolver 解析当前模块的解析器。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @param {Builder} builder 当前正在使用的构建器。
 * @returns {BuildModule} 返回对应的模块。
 */
exports.getModule = function(file, resolver, options, builder) {
    var module = file.module;
    if (!module) {
        file.module = module = new BuildModule(file);
        resolver(module, options, builder);
    }
    return module;
};

/**
 * 解析一个模块的依赖项。
 * @param {BuildModule} module 要解析的模块。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @param {Builder} builder 当前正在使用的构建器。
 */
exports.resolveModule = function(module, options, builder) {
    var ext = module.extension;
    if (/^\.(html?|inc|jsp|asp|php|aspx|ashx)$/i.test(ext)) {
        exports.resolveHtmlModule(module, options, builder);
    } else if (/^\.js$/i.test(ext)) {
        exports.resolveJsModule(module, options, builder);
    } else if (/^\.css$/i.test(ext)) {
        exports.resolveCssModule(module, options, builder);
    } else if (/^\.(txt|text|md)$/i.test(ext)) {
        exports.resolveTextModule(module, options, builder);
    } else {
        exports.resolveResourceModule(module, options, builder);
    }
};

/**
 * 载入指定绝对路径对应的模块。
 * @param {String} path 要载入的绝对路径。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @param {Builder} builder 当前正在使用的构建器。
 * @returns {BuildModule} 返回对应的模块。
 */
exports.getModuleFromPath = function(path, options, builder) {
    return exports.getModule(getFileFromPath(path, builder), exports.resolveModule, options, builder);
};

// #endregion

// #region HTML

/**
 * 分析一个 HTML 模块的依赖项。
 * @param {BuildModule} module 要解析的模块。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @param {Builder} builder 当前正在使用的构建器。
 */
exports.resolveHtmlModule = function(module, options, builder) {

    module.type = 'html';
    
    // 解析地址。
    resolveUrls(module, options, builder);

    // 解析 HTML
    module.content = module.content.replace(/(<script\b(?:'[^']*'|"[^"]*|[^>])*>)([\s\S]*?)(<\/script(?:'[^']*'|"[^"]*|[^>])*>|$)|(<style\b(?:'[^']*'|"[^"]*|[^>])*>)([\s\S]*?)(<\/style(?:'[^']*'|"[^"]*|[^>])*>|$)|<(img|embed|audio|video|link|object|source)\b(?:'[^']*'|"[^"]*|[^>])*>|<!--([\s\S]*?)(?:-->|$)/ig, function (all, scriptStart, script, scriptEnd, styleStart, style, styleEnd, tag, comment) {
        
        // <script>
        if (scriptStart) {
            var src = getAttr(scriptStart, "src");
            var type = getAttr(scriptStart, "type");
            if (src) {
                var result = parseUrl(src, module, options, builder, true);
                if (result.inline) {
                    script = result.content;
                    scriptStart = removeAttr(scriptStart, "src");
                } else {
                    scriptStart = setAttr(scriptStart, "src", result);
                }
            } else {
                script = parseInlined(script, type && type !== "text/javascript" ? builder.getExtByMimeType(type) : '.js', module, options, builder);
            }

            // 导出。
            var dest = parseDest(scriptStart, script, module, options, builder);
            if (dest) {
                return setAttr(scriptStart, "src", dest) + scriptEnd;
            }

            return scriptStart + script + scriptEnd;
        }

        // <style>
        if (styleStart) {
            var type = getAttr(scriptStart, "type");
            style = parseInlined(style, type && type !== "text/css" ? builder.getExtByMimeType(type) : '.css', module, options, builder);
            
            // 导出。
            var dest = parseDest(styleStart, style, module, options, builder);
            if (dest) {
                return setAttr(setAttr('<link' + styleStart.substr('<style'.length), 'rel', 'stylesheet'), 'href', dest);
            }

            return styleStart + style + styleEnd;
        }

        // <link>: 内联或更新地址
        if (tag) {
            
            // <link>
            if (/^<link$/i.test(tag)) {
                var src = getAttr(all, "href");
                if (!src) {
                    return all;
                }
                
                // <link rel="stylesheet">
                var rel = getAttr(all, "rel");
                if (!rel || rel === "stylesheet") {
                    var result = parseUrl(src, module, options, builder, true);
                    return result.inline ? removeAttr(removeAttr('<style' + all.substr("<link".length).replace(/\s*\/>$/, ">"), "rel"), "href") + '\r\n' + result.content + '\r\n</style>' : setAttr(all, "href", result);
                } 
                    
                // <link rel="html">
                if (rel === "html") {
                    var result = parseUrl(src, module, options, builder, true);
                    return result.inline ? result.content : setAttr(all, "href", result);
                }

                return setAttr(all, "href", parseUrl(src, module, options, builder));
            } 
            
            // <object$>
            if (/^<object$/i.test(tag)) {
                var src = getAttr(all, 'data');
                if (!src)
                    return all;

                return setAttr(all, "data", parseUrl(src, module, options, builder));
            } 
            
            // <img>
            if (/^<img/i.test(tag)) {
                // http://www.webkit.org/demos/srcset/
                // <img src="image-src.png" srcset="image-1x.png 1x, image-2x.png 2x, image-3x.png 3x, image-4x.png 4x">
                var srcset = getAttr(all, "srcset");
                if (srcset) {
                    srcset = srcset.replace(/(?:^|,)\s*(.*)\s+\dx\s*(?:,|$)/g, function(src) {
                        return parseUrl(src, module, options, builder);
                    });
                    all = setAttr("srcset", srcset);
                }
            }

            // <... src>
            var src = getAttr(all, 'src');
            if (src) {
                all = setAttr(all, "src", parseUrl(src, module, options, builder));
            }

            src = getAttr(all, 'data-src');
            if (src) {
                all = setAttr(all, "data-src", parseUrl(src, module, options, builder));
            }

            return all;
        }
        
        // <!-- -->
        if (comment) {
            comment = parseComments(comment, module, options, builder);
            return comment != null ? comment : all;
        }

        return all;

    });

};

/**
 * 处理 __dest 指令。
 * @param {} startTag 
 * @param {} module 
 * @param {} options 
 * @param {} builder 
 * @returns {} 
 */
function parseDest(startTag, content, module, options, builder) {
    if (options.inline === false) {
        return;
    }

    var dest = getAttr(startTag, "__dest");
    if (!dest || isUrl(dest)) {
        return;
    }

    var urlObj = splitUrl(dest);
    var name = builder.getName(module.resolveUrl(urlObj.path));
    var file = builder.getFile(name) || builder.addFile(name, "");
    file.content += content;
    return file.destName + urlObj.query;
}

/**
 * 提取字符串中的引号部分。
 * @param {} value 
 * @returns {} 
 */
function removeQuotes(value) {
    var matched = /'([^']*)'|"([^"]*)"/.exec(value);
    return matched ? matched[1] || matched[2] : value.trim();
}

function getAttr(html, attrName) {
    var re = new RegExp('\\s' + attrName + '\\s*(=\\s*([\'"])([\\s\\S]*?)\\2)?', 'i');
    var match = re.exec(html);
    return match ? match[3] || '' : null;
}

function setAttr(html, attrName, attrValue) {
    var re = new RegExp('(\\s' + attrName + '\\s*)((=\\s*([\'"]))([\\s\\S]*?)\\4)?', 'i');
    var needAppend = true;
    attrValue = encodeHTMLAttribute(attrValue);
    html = html.replace(re, function (all, prefix, attrAll, postfix, quote, value) {
        needAppend = false;
        if (attrAll) {
            return prefix + postfix + attrValue + quote;
        }
        return prefix + '="' + attrValue + '"';
    });
    if (needAppend) {
        html = html.replace(/^<[^ ]+\b/, '$& ' + attrName + '="' + attrValue + '"');
    }
    return html;
}

function removeAttr(html, attrName) {
    return html.replace(new RegExp('\\s' + attrName + '\\s*(=\\s*([\'"])([\\s\\S]*?)\\2)?', 'i'), "");
}

function encodeHTMLAttribute(str) {
    console.assert(typeof str === "string", "encodeHTMLAttribute(str: 必须是字符串)");
    return str.replace(/[\'\"]/g, function (v) {
        return ({
            '\'': '&#39;',
            '\"': '&quot;'
        })[v];
    });
}

// #endregion

// #region JS

/**
 * 分析一个 JS 模块。
 * @param {BuildModule} module 要解析的模块。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @param {Builder} builder 当前正在使用的构建器。
 */
exports.resolveJsModule = function (module, options, builder) {

    // 标记文件类型。
    module.type = 'js';

    // 处理 JS 特定内容。
    module.content = module.content.replace(/'(?:[^\\'\n\r\f]|\\[\s\S])*'|"(?:[^\\"\r\n\f]|\\[\s\S])*"|\/(\/[^\r\n\f]+|\*[\s\S]*?(?:\*\/|$))|\brequire\s*\(\s*('(?:[^\\'\n\r\f]|\\[\s\S])*'\s*\)|"(?:[^\\"\r\n\f]|\\[\s\S])*"\s*\)|\[(?:(?:'(?:[^\\'\n\r\f]|\\[\s\S])*'|"(?:[^\\"\r\n\f]|\\[\s\S])*"),?\s*)+\]\s*(?:,|function\b))|\b(exports\.|module\.|process\.|global\.|Buffer\b|setImmediate\b|clearImmediate\b)/g, function (all, comment, require, symbols) {
        
        // 处理注释。//  或 /*...*/
        if (comment) {
            comment = parseComments(comment, module, options, builder);
            return comment != null ? comment : all;
        } 
        
        // 处理 require。// '...' 或 "..." 或 [...]
        if (require) {
            // 异步 require, require([...], 
            if (require.startsWith("[")) {
                return all.replace(/'([^\\'\n\r\f]|\\[\s\S])*'|"([^\\"\r\n\f]|\\[\s\S])*"/g, function (all, url, url2) {
                    return JSON.stringify(parseAsyncRequire(url || url2, module, options, builder));
                });
            }
            
            // 同步 require, require('...')
            return all.replace(/'([^\\'\n\r\f]|\\[\s\S])*'|"([^\\"\r\n\f]|\\[\s\S])*"/, function (all, url, url2) {
                return JSON.stringify(parseCommonJsRequire(url || url2, module, options, builder));
            });
        } 
        
        // 全局标识符。
        if (symbols) {
            module.flags[symbols.replace(/\.$/, "")] = true;
        }

        return all;
    });
    
    // 处理内部地址。
    resolveUrls(module, options, builder);



    //return;

    //// 发现 exports 或 module 时自动指定为 commonJs 模块。
    //if (options.resolveCommonJsExports !== false && !module.flags.commonJs && /\b(exports\.|module\.|process\.|global\.|Buffer|setImmediate\(|clearImmediate\()/.test(module.content)) {
    //    module.flags.commonJs = true;
    //    module.flags.global = /\bglobal\./.test(module.content);
    //    module.flags.process = /\bprocess\./.test(module.content) && module.path !== getNodeNativeModule('process');
    //    module.flags.Buffer = /\bBuffer/.test(module.content) && module.path !== getNodeNativeModule('Buffer');
    //    module.flags.setImmediate = /\bsetImmediate\(/.test(module.content) && module.path !== getNodeNativeModule('timers');
    //    module.flags.clearImmediate = /\bclearImmediate\(/.test(module.content) && module.path !== getNodeNativeModule('timers');

    //}

    //if (module.flags.commonJs) {
    //    if (module.flags.process) {
    //        module.flags.process = parseCommonJsRequire('process', module, options, builder);
    //    }
    //    if (module.flags.Buffer) {
    //        module.flags.Buffer = parseCommonJsRequire('Buffer', module, options, builder);
    //    }
    //    if (module.flags.setImmediate) {
    //        module.flags.setImmediate = parseCommonJsRequire('timers', module, options, builder);
    //    }
    //    if (module.flags.clearImmediate) {
    //        module.flags.clearImmediate = parseCommonJsRequire('timers', module, options, builder);
    //    }
    //}

    //// 恢复注释。
    //if (removedSegments.length) {
    //    module.content = module.content.replace(/\/\*_comment:(\d+)\*\//g, function (_, id) {
    //        return removedSegments[id];
    //    });
    //}

}

/**
 * 解析一个模块内的 CommonJs require 指令。
 * @param {String} url 被包含的地址。
 * @param {BuildModule} module 当前正在处理的模块。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @param {Builder} builder 当前正在使用的构建器。
 * @returns {String} 返回原 require() 占位符。
 */
function parseCommonJsRequire(url, module, options, builder) {

    module.flags.commonJs = true;

    // 解析 node 内置模块。
    if(options.resolveNodeNativeModules !== false) {
        var path = getNodeNativeModule(url);
        if (path) {
            var relatedModule = exports.getModuleFromPath(urlObj.path, options, builder);
            module.require(relatedModule);
            return relatedModule.name = url;
        }
    }

    // 解析位置。
    var urlObj = exports.requireResolveUrl(url, module, options, builder, true);
    if (urlObj.isUrl) {
        return url;
    }
    if (urlObj.notFound) {
        builder.warn("{0}: Cannot find module '{1}'", module.name, url);
        return url;
    }

    // 解析目标模块。
    var relatedModule = exports.getModuleFromPath(urlObj.path, options, builder);
    if (!module.require(relatedModule)) {
        builder.warn("{0}: Circular References with '{1}'", module.name, url);
    }
    return relatedModule.name;
}

/**
 * 解析一个模块内的异步导入指令。
 * @param {String} url 被包含的地址。
 * @param {BuildModule} module 当前正在处理的模块。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @param {Builder} builder 当前正在使用的构建器。
 * @returns {String} 返回原 require() 占位符。
 */
function parseAsyncRequire(url, module, options, builder) {

    module.flags.hasAsyncRequire = true;

    // 解析位置。
    var urlObj = exports.requireResolveUrl(url, module, options, builder, true);
    if (urlObj.isUrl) {
        return url;
    }
    if (urlObj.notFound) {
        builder.warn("{0}: Cannot find module '{1}'", module.name, url);
        return url;
    }

    return module.createPathPlaceholder(getFileFromPath(urlObj.path, builder), urlObj.query, options);
}

/**
 * 将 JS 模块打包成一个文件。
 * @param {BuildModule} module 当前正在处理的模块。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @returns {String} 返回打包结果。
 */
function packJsModule(module, options) {

    // 如果一个文件打包为全局类型且没有依赖项。则保持全局状态。否则都需要添加 统一运行的头。
    if ((module.buildType === "module" || module.buildType === "global") && !module.flags.commonJs && !module.flags.hasAsyncRequire) {
        return module.content;
    }

    if (module.buildType === "nonmodule") {
        return module.content;
    }

    var result = '';

    // 只要依赖的任一模块存在异步加载，则必须添加异步加载支持。
    var finalFlags = {};

    // 遍历模块及其所有依赖项。
    module.walk(function (currentModule) {
        for (var flag in currentModule.flags) {
            finalFlags[flag] = finalFlags[flag] || currentModule.flags[flag];
        }

        switch (currentModule.type) {
            case 'js':
                result += '\r\n__tpack__.define(' + JSON.stringify(currentModule.name) + ', function(exports, module, require){\r\n' + currentModule.content + '\r\n});\r\n';
                break;
            case 'css':
                result += '\r\n__tpack__.insertStyle(' + JSON.stringify(currentModule.content) + ');\r\n';
                break;
            case "html":
                // HTML 直接以字符串插入。
                result += '\r\n' + JSON.stringify(currentModule.content) + '\r\n';
                break;
        }
    });

    var header = 'var __tpack__ = __tpack__ || {\r\n\tmodules: { __proto__: null },\r\n';

    header += '\tdefine: function (moduleName, factory) {\r\n' +
        '\t\treturn __tpack__.modules[moduleName] = {\r\n' +
        '\t\t\tfactory: factory,\r\n' +
        '\t\t\texports: {}\r\n' +
        '\t\t};\r\n' +
        '\t}';

    if (finalFlags.hasStyleLoader) {

    }

    if (finalFlags.hasAsyncRequire) {

    }

    header += ',\r\n\trequire: function (moduleName, callback) {\r\n' +
        '\t\tvar module = __tpack__.modules[moduleName];\r\n' +
        '\t\tif (!module) {\r\n' +
        '\t\t\tthrow new Error("Can not find module: " + moduleName);\r\n' +
        '\t\t}\r\n' +
        '\t\tif (!module.loaded) {\r\n' +
        '\t\t\tmodule.loaded = true;\r\n' +
        '\t\t\tmodule.factory.call(module.exports, module.exports, module, __tpack__.require, moduleName);\r\n' +
        '\t\t}\r\n' +
        '\t\treturn module.exports;\r\n' +
        '\t}';

    header += '\r\n};\r\n';

    result = header + result;

    if (finalFlags.global) {
        result += '\r\nthis.global = (function(){return this;)();\r\n';
    }
    if (finalFlags.process) {
        result += '\r\nthis.process = __tpack__.require(' + JSON.stringify(finalFlags.process) + ');\r\n';
    }
    if (finalFlags.Buffer) {
        result += '\r\nthis.Buffer = __tpack__.require(' + JSON.stringify(finalFlags.Buffer) + ');\r\n';
    }
    if (finalFlags.setImmediate) {
        result += '\r\nthis.setImmediate = __tpack__.require(' + JSON.stringify(finalFlags.setImmediate) + ').setImmediate;\r\n';
    }
    if (finalFlags.clearImmediate) {
        result += '\r\nthis.clearImmediate = __tpack__.require(' + JSON.stringify(finalFlags.clearImmediate) + ').clearImmediate;\r\n';
    }

    // 添加统一尾。
    switch (module.buildType) {
        case "module":
        case "global":
            return result + '\r\n__tpack__.require(' + JSON.stringify(module.name) + ');';
        case "umd":
            return result + getSourceCode(function () {
                if (typeof define !== "undefined" && define.amd) {
                    define(function () { return __tpack__.require(0); });
                } else if (typeof module !== "undefined") {
                    module.exports = __tpack__.require(0);
                } else {
                    (function (exports, value) {
                        for (var key in value) exports[key] = value[key];
                    })(typeof exports === 'object' ? exports : this, __tpack__.require(0));
                }
            }).replace(/0/g, JSON.stringify(module.name));
        case "amd":
            return getSourceCode(function () {
                BODY;
                define([], function () {
                    return __tpack__.require(0);
                });
            }).replace("BODY;", result).replace('0', JSON.stringify(module.name));
        case "cmd":
            return getSourceCode(function () {
                BODY;
                define(function (exports, module, require) {
                    module.exports = __tpack__.require(0);
                });
            }).replace("BODY;", result).replace('0', JSON.stringify(module.name));
        default:
            return getSourceCode(function () {
                BODY;
                module.exports = __tpack__.require(0);
            }).replace("BODY;", result).replace('0', JSON.stringify(module.name));
    }


}

function getSourceCode(fn) {
    return fn.toString().replace(/^function.*?\{/, "").replace(/\}$/, "");
}

/**
 * 获取指定路径表示的 node 原生模块。
 * @param {String} url 原生模块名。 
 * @returns {String} 
 */
function getNodeNativeModule(url) {
    return require("node-libs-browser")[url];
}

// #endregion

// #region CSS

/**
 * 分析一个 CSS 模块的依赖项。
 * @param {BuildModule} module 要解析的模块。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @param {Builder} builder 当前正在使用的构建器。
 */
exports.resolveCssModule = function(module, options, builder) {

    module.type = 'css';
    module.flags.hasStyleLoader = true;

    // @import url(): 内联或重定向。
    if (options.resolveCssUrl !== false) {
        module.content = module.content.replace(/((@import\s+)?url\(\s*(['"]?))(.*?)(\3\s*\))/, function(all, prefix, atImport, q, url, postfix) {

            // 内联 CSS。
            if (atImport) {
                var result = parseUrl(url, module, options, builder, true);
                return result.inline ? result.content : prefix + result + postfix;
            }

            // 否则是图片等外部资源。
            return prefix + parseUrl(url, module, options, builder) + postfix;

        });
    }

    resolveUrls(module, options, builder);

};

// #endregion

// #region 其它资源

/**
 * 解析一个文本模块。
 * @param {BuildModule} module 要解析的模块。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @param {Builder} builder 当前正在使用的构建器。
 */
exports.resolveTextModule = function(module, options, builder) {
    module.type = 'text';
    resolveUrls(module, options, builder);
};

/**
 * 解析一个二进制模块。
 * @param {BuildModule} module 要解析的模块。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @param {Builder} builder 当前正在使用的构建器。
 */
exports.resolveResourceModule = function(module, options, builder) {
    module.type = 'resource';
};

// #endregion

// #region BuildModule

/**
 * 表示一个生成模块。一个生成模块拥有依赖项。
 * @param {String} content 当前模块的内容。
 * @param {BuildFile} [file] 如果是本地文件，当前模块的源文件。
 */
function BuildModule(file) {
    this.file = file;
    this.required = [];
    this.excluded = [];
    this.included = [];
    this.flags = { __proto__: null };
}

BuildModule.prototype = {
    constructor: BuildModule,

    // #region 路径

    /**
     * 获取当前模块对应的文件。
     * @type {BuildFile}
     */
    file: null,

    /**
     * 获取当前模块的路径。
     * @type {String}
     */
    get path() {
        return this.file.srcPath;
    },

    /**
     * 获取当前模块的友好名称。如果是本地模块则返回文件名称，否则返回完整网址。
     * @type {String}
     */
    get name() {
        return this._name || this.file.srcName;
    },

    /**
     * 设置当前模块的友好名称。
     */
    set name(value) {
        this._name = value;  
    },

    /**
     * 获取当前模块的扩展名。
     */
    get extension() {
        return this.file.extension;
    },
    
    /**
     * 解析当前模块内指定地址实际代表的路径。
     * @param {String} url 
     * @returns {String} 
     */
    resolveUrl: function (url) {
        return this.file.resolvePath(url);
    },

    ///**
    // * 创建指定从当前模块访问文件的占位符。
    // */
    //createPathPlaceholder: function (file, query, options) {
    //    var urlPostfix = options.urlPostfix;
    //    if (urlPostfix) {
    //        urlPostfix = typeof options.urlPostfix === "function" ?
    //            options.urlPostfix(file.srcName + query, file) : String(options.urlPostfix);
    //    }
    //    return this.file.createPathPlaceholder(function() {
    //        return this.relativePath(file.destName) + (urlPostfix ? query + (query ? '&' : '?') + this.formatName(urlPostfix) : query);
    //    });
    //},

    // #endregion

    // #region 内容

    /**
     * 获取当前模块的类型。可能的值有空、"html"、"js"、"css"、"text"、"resource"、"other"。
     */
    type: "",

    /**
     * 获取当前模块预设的打包类型，仅当 type=="js" 时有效。可能的值有："global"、"amd"、"umd"、"cmd"、"commonjs"。
     */
    moduleType: "module",

    /**
     * 获取当前模块的内容。
     */
    get content() {
        if (this._content != undefined) {
            return this._content;
        }
        return this.file.content;
    },

    /**
     * 设置当前模块的内容。
     */
    set content(value) {
        this._content = value;
    },

    /**
     * 以二进制格式获取当前模块的内容。
     */
    get buffer() {
        return this._content != undefined ? new Buffer(this._content) : this.file.buffer;
    },

    // #endregion

    // #region 引用
    
    /**
     * 标记当前模块的依赖模块。
     * @param {BuildModule} module 依赖的直接模块。
     * @returns {Boolean} 如果成功添加依赖则返回 @true，否则返回 @false，说明模块已依赖。 
     */
    require: function (module) {
        if (module.hasRequire(this)) {
            return false;
        }
        if (this.required.indexOf(module) < 0) {
            this.required.push(module);
        }
        return true;
    },

    /**
     * 判断当前模块及包含项是否已包含目标。
     * @param {BuildModule} module 依赖的直接模块。
     * @returns {Boolean} 
     */
    hasRequire: function (module) {

        // 被当前模块包含。
        if (this === module) {
            return true;
        }

        for (var i = 0; i < this.required.length; i++) {
            if (this.required[i].hasRequire(module)) {
                return true;
            }
        }

        return false;
    },
    
    /**
     * 添加当前模块的一个排除路径。
     * @param {BuildModule} module 依赖的直接模块。
     * @returns {Boolean} 
     */
    exclude: function (module) {
        if (this.excluded.indexOf(module) >= 0) {
            return false;
        }
        this.excluded.push(module);
        return true;
    },

    /**
     * 添加当前模块的一个包含文件。
     * @param {BuildFile} file
     * @returns {Boolean} 如果成功添加依赖则返回 @true，否则返回 @false，说明模块已依赖。 
     */
    include: function (module) {
        if (module.hasInclude(this)) {
            return null;
        }
        this.included.push(module);

        // 包含项的依赖项也是当前文件的依赖项。
        for (var flag in module.flags) {
            this.flags[flag] = this.flags[flag] || module.flags[flag];
        }
        for (var i = 0; i < module.required.length; i++) {
            this.require(module.required[i]);
        }
        for (var i = 0; i < module.excluded.length; i++) {
            this.exclude(module.excluded[i]);
        }

        return module.content;
    },

    /**
     * 判断当前模块及包含项是否已包含目标。
     * @param {} module
     * @returns {} 
     */
    hasInclude: function (module) {

        // 被当前模块包含。
        if (this === module) {
            return true;
        }

        for (var i = 0; i < this.included.length; i++) {
            if (this.included[i].hasInclude(module)) {
                return true;
            }
        }

        return false;
    },

    /**
     * 遍历当前模块的所有依赖项。
     * @param {Function} callback 
     */
    walk: function (callback) {

        var bind = this;

        // 计算模块的排除项。
        var excludedList = [];

        // 添加一个排除项，排除项依赖的项同时排除。
        function addExclude(module) {

            // 添加到排除列表，不重复排除。
            if (excludedList.indexOf(module) >= 0) {
                return;
            }
            excludedList.push(module);

            // 排除项的依赖项同样排除。
            for (var i = 0; i < module.required.length; i++) {
                addExclude(module.required[i]);
            }
        }

        // 应用模块指定的排除列表，依赖模块的排除列表同时应用。
        function applyExclude(module) {
            for (var i = 0; i < module.excluded.length; i++) {
                addExclude(module.excluded[i]);
            }
            for (var i = 0; i < module.required.length; i++) {
                applyExclude(module.required[i]);
            }
        }

        function applyInclude(module) {

            // 不重复包含。
            if (excludedList.indexOf(module) >= 0) {
                return;
            }
            excludedList.push(module);

            // 处理依赖项。
            for (var i = 0; i < module.required.length; i++) {
                applyInclude(module.required[i]);
            }

            callback.call(bind, module);

        }

        // 主模块的依赖项直接排除。
        applyExclude(this);

        // 处理依赖。
        applyInclude(this);

    },

    // #endregion

    /**
     * 打包当前模块并返回最终源码。
     * @param {Object} options 用户设置的传递给当前插件的选项。
     * @returns {String} 返回打包结果。
     */
    pack: function(options) {
        switch (this.type) {
            case "js":
                return packJsModule(this, options);
            case "resource":
                return null;
            default:
                return this.content;
        }
    }

};

exports.BuildModule = BuildModule;

// #endregion

// #region 公用

/**
 * 解析一个普通模块。
 * @param {BuildModule} module 要解析的模块。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @param {Builder} builder 当前正在使用的构建器。
 */
function resolveUrls(module, options, builder) {
    if (options.resolveUrls !== false) {
        module.content = module.content.replace(/([^\s'",=\(\[\{\)\]\}]*)[?&]__url\b/g, function (_, url) {
            return parseUrl(url.replace(/[?&]__url/, ''), module, options, builder);
        });
    }
}

/**
 * 解析文件内的地址。可能为地址内联或追加时间戳。
 * @param {String} url 要处理的相对路径。
 * @param {BuildModule} module 当前正在处理的模块。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @param {Builder} builder 当前正在使用的构建器。
 * @param {Boolean} [returnContentIfInline=false] 如果需要转为内联时，@true 表示返回内容，@false 表示返回 base64 编码。
 * @return {String|Object} 返回文件新地址，或者返回文件信息。
 */
function parseUrl(url, module, options, builder, returnContentIfInline) {

    // 解析位置。
    var urlObj = exports.requireResolveUrl(url, module, options, builder);
    if (urlObj.isUrl) {
        return url;
    }
    if (urlObj.notFound) {
        builder.warn("{0}: Reference Not Found: '{1}'", module.name, url);
        return url;
    }

    // 获取对应的文件。
    var relatedModule = exports.getModuleFromPath(urlObj.path, options, builder);
    
    // 处理内联。
    var inlineLimit = options.inline === false ? 0 :
        options.inline === true ? -1 :
        typeof options.inline === "function" ? options.inline(url, relatedModule.file) ? -1 : 0 :
        typeof options.inline === "number" ? options.inline :
        /\b__inline\b/.test(urlObj.query) ? +(/\b__inline\s*=\s*(\d+)/.exec(urlObj.query) || [0, -1])[1] : 0;
    if (inlineLimit !== 0 && (inlineLimit < 0 || relatedModule.buffer.length < inlineLimit)) {
        return returnContentIfInline ? {
            inline: true,
            content: module.include(relatedModule)
        } : relatedModule.file.getBase64Url();
    }

    return buildUrl(relatedModule.file, urlObj.query, options);
}

/**
 * 解析文件内联的其它文件。
 * @param {String} content 内联的内容。
 * @param {String} ext 内联的扩展名。
 * @param {BuildModule} module 要解析的模块。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @param {Builder} builder 当前正在使用的构建器。
 * @returns {String} 返回处理后的新内联结果。
 */
function parseInlined(content, ext, module, options, builder) {
    var file = builder.createFile(module.name + "#inline" + (module._inlineCounter = (module._inlineCounter + 1) || 0) + ext, content);
    builder.processFile(file);
    return file.content;
}

/**
 * 解析代码内的注释部分。
 * @param {} comment 
 * @param {} module 
 * @param {} options 
 * @param {} builder 
 * @returns {} 
 */
function parseComments(comment, module, options, builder) {

    // 不解析注释。
    if (options.resolveComments === false) {
        return ;
    }

    var result = null;
    
    // 解析注释
    comment = comment.replace(/#(\w+)\s+(.*)/g, function (all, macroName, macroArgs) {
        if (macroName === "include") {
            result += parseInclude(macroArgs, module, options, builder) || all;
        }
        if (macroName === "exclude") {
            result +=  parseExclude(macroArgs, module, options, builder);
        }
        if (macroName === "moduletype") {
            result += parseModuleType(removeQuotes(macroArgs), module, options, builder);
        }
        return all;
    });

    return result;
}

/**
 * 解析一个模块内的包含指令。返回被包含的模块内容。
 * @param {String} url 被包含的地址。
 * @param {BuildModule} module 当前正在处理的模块。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @param {Builder} builder 当前正在使用的构建器。
 * @returns {String} 返回被包含文件的内容。
 */
function parseInclude(url, module, options, builder) {

    // 解析位置。
    var urlObj = exports.requireResolveUrl(url, module, options, builder);
    if (urlObj.isUrl) {
        builder.warn("{0}: Cannot Include Remote Path: {1}", module.path, url);
        return;
    }
    if (urlObj.notFound) {
        builder.warn("{0}: Include Not Found: {1}", module.path, url);
        return;
    }

    // 尝试包含，判断是否存在互嵌套。
    var result = module.include(exports.getModuleFromPath(urlObj.path, options, builder));
    if (!result) {
        builder.warn('{0}: Circular Include with {1}', module.path, url);
        return;
    }

    return result;
}

/**
 * 解析一个模块内的排除指令。
 * @param {String} url 被排除的地址。
 * @param {BuildModule} module 当前正在处理的模块。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @param {Builder} builder 当前正在使用的构建器。
 * @returns {String} 返回原 #exclude 占位符。
 */
function parseExclude(url, module, options, builder) {

    // 解析位置。
    var urlObj = exports.requireResolveUrl(url, module, options, builder, true);
    if (urlObj.isUrl || urlObj.notFound) {
        return "";
    }

    module.exclude(exports.getModuleFromPath(urlObj.path, options, builder));
    return "";
}

/**
 * 解析一个模块内的模块类型指令。
 * @param {String} type 页面设置的类型。
 * @param {BuildModule} module 当前正在处理的模块。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @param {Builder} builder 当前正在使用的构建器。
 * @returns {String} 返回原 #moduletype 占位符。
 */
function parseModuleType(type, module, options, builder) {
    type = type.toLowerCase();
    if (type === "global" || type === "amd" || type === "cmd" || type === "umd" || type === "commonjs") {
        module.moduleType = type;
    } else {
        builder.warn("{0}: #moduletype Can only be one of 'global', 'cmd', 'amd', 'umd' and 'commonjs'. Currently is set to {1}", module.name, type);
    }
    return "";
}

function getFileFromPath(path, builder) {
    return builder.getFile(builder.getName(path));
}

function buildUrl(file, query, options) {
    var urlPostfix = options.urlPostfix;
    if (urlPostfix) {
        urlPostfix = typeof urlPostfix === "function" ?
            urlPostfix.call(file, file.srcName + query, file) : String(urlPostfix);
    }
    return this.relativePath(file.destName) + (urlPostfix ? query + (query ? '&' : '?') + file.formatName(urlPostfix) : query);
}

// #endregion

// #region 路径处理

/**
 * 解析一个文件内指定相对路径实际所表示的路径。
 * @param {String} url 要处理的相对路径。
 * @param {BuildModule} module 当前正在处理的模块。
 * @param {Object} options 用户设置的传递给当前插件的选项。
 * @param {Builder} builder 当前正在使用的构建器。
 * @param {Boolean} requireMode 如果设置为 @true，则“a/b.js”被作为全局路径处理。
 * @returns {Object} 返回一个对象。包含以下信息：
 * * @property {Boolean} isUrl 指示当前路径是否为网址。
 * * @property {String} url 如果是网址，则返回完整的网址部分。
 * * @property {String} path 如果是文件路径，则返回完整的绝对路径部分。
 * * @property {String} query 查询参数部分。
 * * @property {Boolean} notFound 指示当前路径是否指向不存在的文件。
 */
exports.requireResolveUrl = function(url, module, options, builder, requireMode) {

    // 自主导入地址。
    if (options.importer) {
        url = options.importer(url, module.file, options, builder, requireMode) || url;
    }

    // 不处理网络地址。
    if (isUrl(url)) {
        return {
            isUrl: true,
            url: url
        };
    }

    // 搜索路径。
    var paths = [];

    // 拆开 ? 前后
    var urlObj = splitUrl(url);

    // 相对路径或绝对路径可直接解析。
    if (/^[\.\/]/.test(urlObj.path)) {

        // . 开头表示相对路径。
        paths.push(module.resolveUrl(urlObj.path));

    } else if (Path.isAbsolute(urlObj.path)) {

        // 其它绝对路径 E:/a。
        paths.push(urlObj.path);

    } else {

        // 直接单词开头可以表示相对路径，也可以表示全局搜索路径。
        if (!requireMode) {
            paths.push(module.resolveUrl(urlObj.path));
        }

        // 全局搜索路径。
        if (options.paths) {
            for (var i = 0; i < options.paths.length; i++) {
                paths.push(Path.resolve(options.paths[i], urlObj.path));
            }
        }

        // node_modules 全局搜索路径。
        if (requireMode && options.searchNodeModules !== false) {
            var dir = module.path, p = null;
            while (p !== dir) {
                p = dir;
                dir = Path.dirname(dir);
                paths.push(Path.join(dir, 'node_modules', urlObj.path));
            }
        }

    }

    // 解析各种扩展名组合结果。
    var extensions = options.extensions;
    for (var i = 0; i < paths.length; i++) {

        // 判断未补充扩展名是否存在。
        if (IO.existsFile(paths[i])) {
            urlObj.path = paths[i];
            return urlObj;
        }

        // 尝试自动填充扩展名。
        if (extensions) {
            for (var j = 0; j < extensions.length; j++) {
                if (IO.existsFile(paths[i] + extensions[j])) {
                    urlObj.path = paths[i] + extensions[j];
                    return urlObj;
                }
            }
        }

    }

    urlObj.notFound = true;
    return urlObj;
};

function isUrl(url) {
    return /^(\w+:)?\/\//.test(url);
}

function splitUrl(url) {
    var urlObj = /^(.*)([\?&].*)$/.exec(url);
    return urlObj ? {
        path: urlObj[1],
        query: urlObj[2]
    } : {
        path: url,
        query: ""
    };
}

// #endregion


































































return;



/////////////////////////////////////////////////////////////


/*
 * fis
 * http://fis.baidu.com/
 */

'use strict';

var CACHE_DIR;

var exports = module.exports = function (file) {
    if (!CACHE_DIR) {
        fis.log.error('uninitialized compile cache directory.');
    }
    file = fis.file.wrap(file);
    if (!file.realpath) {
        error('unable to compile [' + file.subpath + ']: Invalid file realpath.');
    }
    fis.log.debug('compile [' + file.realpath + '] start');
    fis.emitter.emit('compile:start', file);
    if (file.isFile()) {
        if (file.useCompile && file.ext && file.ext !== '.') {
            var cache = file.cache = fis.cache(file.realpath, CACHE_DIR),
                revertObj = {};
            if (file.useCache && cache.revert(revertObj)) {
                exports.settings.beforeCacheRevert(file);
                file.requires = revertObj.info.requires;
                file.extras = revertObj.info.extras;
                if (file.isText()) {
                    revertObj.content = revertObj.content.toString('utf8');
                }
                file.setContent(revertObj.content);
                exports.settings.afterCacheRevert(file);
            } else {
                exports.settings.beforeCompile(file);
                file.setContent(fis.util.read(file.realpath));
                process(file);
                exports.settings.afterCompile(file);
                revertObj = {
                    requires: file.requires,
                    extras: file.extras
                };
                cache.save(file.getContent(), revertObj);
            }
        } else {
            file.setContent(file.isText() ? fis.util.read(file.realpath) : fis.util.fs.readFileSync(file.realpath));
        }
    } else if (file.useCompile && file.ext && file.ext !== '.') {
        process(file);
    }
    if (exports.settings.hash && file.useHash) {
        file.getHash();
    }
    file.compiled = true;
    fis.log.debug('compile [' + file.realpath + '] end');
    fis.emitter.emit('compile:end', file);
    embeddedUnlock(file);
    return file;
};

exports.settings = {
    unique: false,
    debug: false,
    optimize: false,
    lint: false,
    test: false,
    hash: false,
    domain: false,
    beforeCacheRevert: function () { },
    afterCacheRevert: function () { },
    beforeCompile: function () { },
    afterCompile: function () { }
};

exports.setup = function (opt) {
    var settings = exports.settings;
    if (opt) {
        fis.util.map(settings, function (key) {
            if (typeof opt[key] !== 'undefined') {
                settings[key] = opt[key];
            }
        });
    }
    CACHE_DIR = 'compile/';
    if (settings.unique) {
        CACHE_DIR += Date.now() + '-' + Math.random();
    } else {
        CACHE_DIR += ''
            + (settings.debug ? 'debug' : 'release')
            + (settings.optimize ? '-optimize' : '')
            + (settings.hash ? '-hash' : '')
            + (settings.domain ? '-domain' : '');
    }
    return CACHE_DIR;
};

exports.clean = function (name) {
    if (name) {
        fis.cache.clean('compile/' + name);
    } else if (CACHE_DIR) {
        fis.cache.clean(CACHE_DIR);
    } else {
        fis.cache.clean('compile');
    }
};

var map = exports.lang = (function () {
    var keywords = ['require', 'embed', 'uri', 'dep', 'jsEmbed'],
        LD = '<<<', RD = '>>>',
        qLd = fis.util.escapeReg(LD),
        qRd = fis.util.escapeReg(RD),
        map = {
            reg: new RegExp(
                qLd + '(' + keywords.join('|') + '):([\\s\\S]+?)' + qRd,
                'g'
            )
        };
    keywords.forEach(function (key) {
        map[key] = {};
        map[key]['ld'] = LD + key + ':';
        map[key]['rd'] = RD;
    });
    return map;
})();

//"abc?__inline" return true
//"abc?__inlinee" return false
//"abc?a=1&__inline"" return true
function isInline(info) {
    return /[?&]__inline(?:[=&'"]|$)/.test(info.query);
}

//analyse [@require id] syntax in comment
function analyseComment(comment, callback) {
    var reg = /(@require\s+)('[^']+'|"[^"]+"|[^\s;!@#%^&*()]+)/g;
    callback = callback || function (m, prefix, value) {
        return prefix + map.require.ld + value + map.require.rd;
    };
    return comment.replace(reg, callback);
}

//expand javascript
//[@require id] in comment to require resource
//__inline(path) to embedd resource content or base64 encodings
//__uri(path) to locate resource
//require(path) to require resource
function extJs(content, callback) {
    var reg = /"(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|(\/\/[^\r\n\f]+|\/\*[\s\S]*?(?:\*\/|$))|\b(__inline|__uri|require)\s*\(\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*')\s*\)/g;
    callback = callback || function (m, comment, type, value) {
        if (type) {
            switch (type) {
                case '__inline':
                    m = map.jsEmbed.ld + value + map.jsEmbed.rd;
                    break;
                case '__uri':
                    m = map.uri.ld + value + map.uri.rd;
                    break;
                case 'require':
                    m = 'require(' + map.require.ld + value + map.require.rd + ')';
                    break;
            }
        } else if (comment) {
            m = analyseComment(comment);
        }
        return m;
    };
    return content.replace(reg, callback);
}

//expand css
//[@require id] in comment to require resource
//[@import url(path?__inline)] to embed resource content
//url(path) to locate resource
//url(path?__inline) to embed resource content or base64 encodings
//src=path to locate resource
function extCss(content, callback) {
    var reg = /(\/\*[\s\S]*?(?:\*\/|$))|(?:@import\s+)?\burl\s*\(\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|[^)}\s]+)\s*\)(\s*;?)|\bsrc\s*=\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|[^\s}]+)/g;
    callback = callback || function (m, comment, url, last, filter) {
        if (url) {
            var key = isInline(fis.util.query(url)) ? 'embed' : 'uri';
            if (m.indexOf('@') === 0) {
                if (key === 'embed') {
                    m = map.embed.ld + url + map.embed.rd + last.replace(/;$/, '');
                } else {
                    m = '@import url(' + map.uri.ld + url + map.uri.rd + ')' + last;
                }
            } else {
                m = 'url(' + map[key].ld + url + map[key].rd + ')' + last;
            }
        } else if (filter) {
            m = 'src=' + map.uri.ld + filter + map.uri.rd;
        } else if (comment) {
            m = analyseComment(comment);
        }
        return m;
    };
    return content.replace(reg, callback);
}

//expand html
//[@require id] in comment to require resource
//<!--inline[path]--> to embed resource content
//<img|embed|audio|video|link|object ... (data-)?src="path"/> to locate resource
//<img|embed|audio|video|link|object ... (data-)?src="path?__inline"/> to embed resource content
//<script|style ... src="path"></script|style> to locate js|css resource
//<script|style ... src="path?__inline"></script|style> to embed js|css resource
//<script|style ...>...</script|style> to analyse as js|css
function extHtml(content, callback) {
    var reg = /(<script(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))([\s\S]*?)(?=<\/script\s*>|$)|(<style(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))([\s\S]*?)(?=<\/style\s*>|$)|<(img|embed|audio|video|link|object|source)\s+[\s\S]*?["'\s\w\/\-](?:>|$)|<!--inline\[([^\]]+)\]-->|<!--(?!\[)([\s\S]*?)(-->|$)/ig;
    callback = callback || function (m, $1, $2, $3, $4, $5, $6, $7, $8) {
        if ($1) {//<script>
            var embed = '';
            $1 = $1.replace(/(\s(?:data-)?src\s*=\s*)('[^']+'|"[^"]+"|[^\s\/>]+)/ig, function (m, prefix, value) {
                if (isInline(fis.util.query(value))) {
                    embed += map.embed.ld + value + map.embed.rd;
                    return '';
                } else {
                    return prefix + map.uri.ld + value + map.uri.rd;
                }
            });
            if (embed) {
                //embed file
                m = $1 + embed;
            } else if (!/\s+type\s*=/i.test($1) || /\s+type\s*=\s*(['"]?)text\/javascript\1/i.test($1)) {
                //without attrubite [type] or must be [text/javascript]
                m = $1 + extJs($2);
            } else {
                //other type as html
                m = $1 + extHtml($2);
            }
        } else if ($3) {//<style>
            m = $3 + extCss($4);
        } else if ($5) {//<img|embed|audio|video|link|object|source>
            var tag = $5.toLowerCase();
            if (tag === 'link') {
                var inline = '', isCssLink = false, isImportLink = false;
                var result = m.match(/\srel\s*=\s*('[^']+'|"[^"]+"|[^\s\/>]+)/i);
                if (result && result[1]) {
                    var rel = result[1].replace(/^['"]|['"]$/g, '').toLowerCase();
                    isCssLink = rel === 'stylesheet';
                    isImportLink = rel === 'import';
                }
                m = m.replace(/(\s(?:data-)?href\s*=\s*)('[^']+'|"[^"]+"|[^\s\/>]+)/ig, function (_, prefix, value) {
                    if ((isCssLink || isImportLink) && isInline(fis.util.query(value))) {
                        if (isCssLink) {
                            inline += '<style' + m.substring(5).replace(/\/(?=>$)/, '').replace(/\s+(?:charset|href|data-href|hreflang|rel|rev|sizes|target)\s*=\s*(?:'[^']+'|"[^"]+"|[^\s\/>]+)/ig, '');
                        }
                        inline += map.embed.ld + value + map.embed.rd;
                        if (isCssLink) {
                            inline += '</style>';
                        }
                        return '';
                    } else {
                        return prefix + map.uri.ld + value + map.uri.rd;
                    }
                });
                m = inline || m;
            } else if (tag === 'object') {
                m = m.replace(/(\sdata\s*=\s*)('[^']+'|"[^"]+"|[^\s\/>]+)/ig, function (m, prefix, value) {
                    return prefix + map.uri.ld + value + map.uri.rd;
                });
            } else {
                m = m.replace(/(\s(?:data-)?src\s*=\s*)('[^']+'|"[^"]+"|[^\s\/>]+)/ig, function (m, prefix, value) {
                    var key = isInline(fis.util.query(value)) ? 'embed' : 'uri';
                    return prefix + map[key]['ld'] + value + map[key]['rd'];
                });
                if (tag == 'img') {
                    //<img src="image-src.png" srcset="image-1x.png 1x, image-2x.png 2x, image-3x.png 3x, image-4x.png 4x">
                    //http://www.webkit.org/demos/srcset/
                    m = m.replace(/(\ssrcset\s*=\s*)('[^']+'|"[^"]+"|[^\s\/>]+)/ig, function (m, prefix, value) {
                        var info = fis.util.stringQuote(value);
                        var set = info.rest.split(',');
                        var imgset = [];
                        set.forEach(function (item) {
                            item = item.trim();
                            var p = item.indexOf(' ');
                            if (p == -1) {
                                imgset.push(item);
                                return;
                            }
                            imgset.push(map['uri']['ld'] + item.substr(0, p) + map['uri']['rd'] + item.substr(p));
                        });
                        return prefix + info.quote + imgset.join(', ') + info.quote;
                    });
                }
            }
        } else if ($6) {
            m = map.embed.ld + $6 + map.embed.rd;
        } else if ($7) {
            m = '<!--' + analyseComment($7) + $8;
        }
        return m;
    };
    return content.replace(reg, callback);
}

function process(file) {
    if (file.useParser !== false) {
        pipe(file, 'parser', file.ext);
    }
    if (file.rExt) {
        if (file.usePreprocessor !== false) {
            pipe(file, 'preprocessor', file.rExt);
        }
        if (file.useStandard !== false) {
            standard(file);
        }
        if (file.usePostprocessor !== false) {
            pipe(file, 'postprocessor', file.rExt);
        }
        if (exports.settings.lint && file.useLint !== false) {
            pipe(file, 'lint', file.rExt, true);
        }
        if (exports.settings.test && file.useTest !== false) {
            pipe(file, 'test', file.rExt, true);
        }
        if (exports.settings.optimize && file.useOptimizer !== false) {
            pipe(file, 'optimizer', file.rExt);
        }
    }
}

function pipe(file, type, ext, keep) {
    var key = type + ext;
    fis.util.pipe(key, function (processor, settings, key) {
        settings.filename = file.realpath;
        var content = file.getContent();
        try {
            fis.log.debug('pipe [' + key + '] start');
            var result = processor(content, file, settings);
            fis.log.debug('pipe [' + key + '] end');
            if (keep) {
                file.setContent(content);
            } else if (typeof result === 'undefined') {
                fis.log.warning('invalid content return of pipe [' + key + ']');
            } else {
                file.setContent(result);
            }
        } catch (e) {
            //log error
            fis.log.debug('pipe [' + key + '] fail');
            var msg = key + ': ' + String(e.message || e.msg || e).trim() + ' [' + (e.filename || file.realpath);
            if (e.hasOwnProperty('line')) {
                msg += ':' + e.line;
                if (e.hasOwnProperty('col')) {
                    msg += ':' + e.col;
                } else if (e.hasOwnProperty('column')) {
                    msg += ':' + e.column;
                }
            }
            msg += ']';
            e.message = msg;
            error(e);
        }
    });
}

var embeddedMap = {};

function error(msg) {
    //for watching, unable to exit
    embeddedMap = {};
    fis.log.error(msg);
}

function embeddedCheck(main, embedded) {
    main = fis.file.wrap(main).realpath;
    embedded = fis.file.wrap(embedded).realpath;
    if (main === embedded) {
        error('unable to embed file[' + main + '] into itself.');
    } else if (embeddedMap[embedded]) {
        var next = embeddedMap[embedded],
            msg = [embedded];
        while (next && next !== embedded) {
            msg.push(next);
            next = embeddedMap[next];
        }
        msg.push(embedded);
        error('circular dependency on [' + msg.join('] -> [') + '].');
    }
    embeddedMap[embedded] = main;
    return true;
}

function embeddedUnlock(file) {
    delete embeddedMap[file.realpath];
}

function addDeps(a, b) {
    if (a && a.cache && b) {
        if (b.cache) {
            a.cache.mergeDeps(b.cache);
        }
        a.cache.addDeps(b.realpath || b);
    }
}

function standard(file) {
    var path = file.realpath,
        content = file.getContent();
    if (typeof content === 'string') {
        fis.log.debug('standard start');
        //expand language ability
        if (file.isHtmlLike) {
            content = extHtml(content);
        } else if (file.isJsLike) {
            content = extJs(content);
        } else if (file.isCssLike) {
            content = extCss(content);
        }
        content = content.replace(map.reg, function (all, type, value) {
            var ret = '', info;
            try {
                switch (type) {
                    case 'require':
                        info = fis.uri.getId(value, file.dirname);
                        file.addRequire(info.id);
                        ret = info.quote + info.id + info.quote;
                        break;
                    case 'uri':
                        info = fis.uri(value, file.dirname);
                        if (info.file && info.file.isFile()) {
                            if (info.file.useHash && exports.settings.hash) {
                                if (embeddedCheck(file, info.file)) {
                                    exports(info.file);
                                    addDeps(file, info.file);
                                }
                            }
                            var query = (info.file.query && info.query) ? '&' + info.query.substring(1) : info.query;
                            var url = info.file.getUrl(exports.settings.hash, exports.settings.domain);
                            var hash = info.hash || info.file.hash;
                            ret = info.quote + url + query + hash + info.quote;
                        } else {
                            ret = value;
                        }
                        break;
                    case 'dep':
                        if (file.cache) {
                            info = fis.uri(value, file.dirname);
                            addDeps(file, info.file);
                        } else {
                            fis.log.warning('unable to add deps to file [' + path + ']');
                        }
                        break;
                    case 'embed':
                    case 'jsEmbed':
                        info = fis.uri(value, file.dirname);
                        var f;
                        if (info.file) {
                            f = info.file;
                        } else if (fis.util.isAbsolute(info.rest)) {
                            f = fis.file(info.rest);
                        }
                        if (f && f.isFile()) {
                            if (embeddedCheck(file, f)) {
                                exports(f);
                                addDeps(file, f);
                                f.requires.forEach(function (id) {
                                    file.addRequire(id);
                                });
                                if (f.isText()) {
                                    ret = f.getContent();
                                    if (type === 'jsEmbed' && !f.isJsLike && !f.isJsonLike) {
                                        ret = JSON.stringify(ret);
                                    }
                                } else {
                                    ret = info.quote + f.getBase64() + info.quote;
                                }
                            }
                        } else {
                            fis.log.error('unable to embed non-existent file [' + value + ']');
                        }
                        break;
                    default:
                        fis.log.error('unsupported fis language tag [' + type + ']');
                }
            } catch (e) {
                embeddedMap = {};
                e.message = e.message + ' in [' + file.subpath + ']';
                throw e;
            }
            return ret;
        });
        file.setContent(content);
        fis.log.debug('standard end');
    }
}

exports.extJs = extJs;
exports.extCss = extCss;
exports.extHtml = extHtml;
exports.isInline = isInline;
exports.analyseComment = analyseComment;
