/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台社区版 (BlueKing PaaS Community Edition) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台社区版 (BlueKing PaaS Community Edition) is licensed under the MIT License.
 *
 * License for 蓝鲸智云PaaS平台社区版 (BlueKing PaaS Community Edition):
 *
 * ---------------------------------------------------
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
 * to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of
 * the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 * THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
*/

/**
 * @file resize-events
 * https://github.com/sdecima/javascript-detect-element-resize
 */

/* eslint-disable max-len */

const requestFrame = (function () {
    const raf = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame
        || function (fn) {
            return window.setTimeout(fn, 20)
        }
    return function (fn) {
        return raf(fn)
    }
})()

const cancelFrame = (function () {
    const cancel = window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame || window.clearTimeout
    return function (id) {
        return cancel(id)
    }
})()

const resetTrigger = function (element) {
    const trigger = element.__resizeTrigger__
    const expand = trigger.firstElementChild
    const contract = trigger.lastElementChild
    const expandChild = expand.firstElementChild

    contract.scrollLeft = contract.scrollWidth
    contract.scrollTop = contract.scrollHeight
    expandChild.style.width = expand.offsetWidth + 1 + 'px'
    expandChild.style.height = expand.offsetHeight + 1 + 'px'
    expand.scrollLeft = expand.scrollWidth
    expand.scrollTop = expand.scrollHeight
}

const checkTriggers = function (element) {
    return element.offsetWidth !== element.__resizeLast__.width || element.offsetHeight !== element.__resizeLast__.height
}

const scrollListener = function (event) {
    resetTrigger(this)
    if (this.__resizeRAF__) cancelFrame(this.__resizeRAF__)
    this.__resizeRAF__ = requestFrame(() => {
        if (checkTriggers(this)) {
            this.__resizeLast__.width = this.offsetWidth
            this.__resizeLast__.height = this.offsetHeight
            this.__resizeListeners__.forEach((fn) => {
                fn.call(this, event)
            })
        }
    })
}

/* Detect CSS Animations support to detect element display/re-attach */
const attachEvent = document.attachEvent
const DOM_PREFIXES = 'Webkit Moz O ms'.split(' ')
const START_EVENTS = 'webkitAnimationStart animationstart oAnimationStart MSAnimationStart'.split(' ')
const RESIZE_ANIMATION_NAME = 'resizeanim'
let animation = false
let keyFramePrefix = ''
let animationStartEvent = 'animationstart'

if (!attachEvent) {
    const testElement = document.createElement('fakeelement')
    if (testElement.style.animationName !== undefined) {
        animation = true
    }

    if (animation === false) {
        let prefix = ''
        for (let i = 0; i < DOM_PREFIXES.length; i++) {
            if (testElement.style[DOM_PREFIXES[i] + 'AnimationName'] !== undefined) {
                prefix = DOM_PREFIXES[i]
                keyFramePrefix = '-' + prefix.toLowerCase() + '-'
                animationStartEvent = START_EVENTS[i]
                animation = true
                break
            }
        }
    }
}

let stylesCreated = false
/* istanbul ignore next */
const createStyles = function () {
    if (!stylesCreated) {
        const animationKeyframes = `@${keyFramePrefix}keyframes ${RESIZE_ANIMATION_NAME} { from { opacity: 0; } to { opacity: 0; } } `
        const animationStyle = `${keyFramePrefix}animation: 1ms ${RESIZE_ANIMATION_NAME};`

        // opacity: 0 works around a chrome bug https://code.google.com/p/chromium/issues/detail?id=286360
        const css = `${animationKeyframes}
      .resize-triggers { ${animationStyle} visibility: hidden; opacity: 0; }
      .resize-triggers, .resize-triggers > div, .contract-trigger:before { content: " "; display: block; position: absolute; top: 0; left: 0; height: 100%; width: 100%; overflow: hidden; z-index: -1 }
      .resize-triggers > div { background: #eee; overflow: auto; }
      .contract-trigger:before { width: 200%; height: 200%; }`

        const head = document.head || document.getElementsByTagName('head')[0]
        const style = document.createElement('style')

        style.type = 'text/css'
        if (style.styleSheet) {
            style.styleSheet.cssText = css
        } else {
            style.appendChild(document.createTextNode(css))
        }

        head.appendChild(style)
        stylesCreated = true
    }
}

export const addResizeListener = function (element, fn) {
    if (attachEvent) {
        element.attachEvent('onresize', fn)
    } else {
        if (!element.__resizeTrigger__) {
            if (getComputedStyle(element).position === 'static') {
                element.style.position = 'relative'
            }
            createStyles()
            element.__resizeLast__ = {}
            element.__resizeListeners__ = []

            const resizeTrigger = element.__resizeTrigger__ = document.createElement('div')
            resizeTrigger.className = 'resize-triggers'
            resizeTrigger.innerHTML = '<div class="expand-trigger"><div></div></div><div class="contract-trigger"></div>'
            element.appendChild(resizeTrigger)

            resetTrigger(element)
            element.addEventListener('scroll', scrollListener, true)

            /* Listen for a css animation to detect element display/re-attach */
            if (animationStartEvent) {
                resizeTrigger.addEventListener(animationStartEvent, function (event) {
                    if (event.animationName === RESIZE_ANIMATION_NAME) {
                        resetTrigger(element)
                    }
                })
            }
        }
        element.__resizeListeners__.push(fn)
    }
}

export const removeResizeListener = function (element, fn) {
    if (!element || !element.__resizeListeners__) return
    if (attachEvent) {
        element.detachEvent('onresize', fn)
    } else {
        element.__resizeListeners__.splice(element.__resizeListeners__.indexOf(fn), 1)
        if (!element.__resizeListeners__.length) {
            element.removeEventListener('scroll', scrollListener)
            element.__resizeTrigger__ = !element.removeChild(element.__resizeTrigger__)
        }
    }
}

export default {
    addResizeListener,
    removeResizeListener
}
