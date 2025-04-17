/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "pages/_app";
exports.ids = ["pages/_app"];
exports.modules = {

/***/ "./components/DotMatrixBackground.tsx":
/*!********************************************!*\
  !*** ./components/DotMatrixBackground.tsx ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var styled_jsx_style__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! styled-jsx/style */ \"styled-jsx/style\");\n/* harmony import */ var styled_jsx_style__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(styled_jsx_style__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);\n\n\n\n// Greyscale dot colors\nconst GREYS = [\n    \"#222\",\n    \"#333\",\n    \"#444\",\n    \"#666\",\n    \"#888\",\n    \"#aaa\",\n    \"#ccc\"\n];\nconst DOT_SIZE = 6;\nconst DOT_GAP = 20;\nfunction getGrey(idx) {\n    return GREYS[idx % GREYS.length];\n}\nconst DotMatrixBackground = ()=>{\n    const [dimensions, setDimensions] = (0,react__WEBPACK_IMPORTED_MODULE_2__.useState)({\n        width: 1920,\n        height: 1080\n    });\n    (0,react__WEBPACK_IMPORTED_MODULE_2__.useEffect)(()=>{\n        function updateSize() {\n            setDimensions({\n                width: window.innerWidth,\n                height: window.innerHeight\n            });\n        }\n        updateSize();\n        window.addEventListener(\"resize\", updateSize);\n        return ()=>window.removeEventListener(\"resize\", updateSize);\n    }, []);\n    const cols = Math.ceil(dimensions.width / DOT_GAP);\n    const rows = Math.ceil(dimensions.height / DOT_GAP);\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n        \"aria-hidden\": \"true\",\n        style: {\n            background: \"#000\",\n            overflow: \"hidden\"\n        },\n        className: \"jsx-bdcfdd39a4a343e0\" + \" \" + \"fixed inset-0 w-full h-full z-0 pointer-events-none select-none\",\n        children: [\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"svg\", {\n                width: dimensions.width,\n                height: dimensions.height,\n                style: {\n                    position: \"absolute\",\n                    top: 0,\n                    left: 0,\n                    opacity: 0.18\n                },\n                className: \"jsx-bdcfdd39a4a343e0\",\n                children: Array.from({\n                    length: rows * cols\n                }).map((_, i)=>{\n                    const row = Math.floor(i / cols);\n                    const col = i % cols;\n                    const color = getGrey(i + row);\n                    // Optionally animate with a subtle pulsate\n                    const delay = (row + col) % 7 * 0.2;\n                    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"circle\", {\n                        cx: col * DOT_GAP + DOT_GAP / 2,\n                        cy: row * DOT_GAP + DOT_GAP / 2,\n                        r: DOT_SIZE / 2,\n                        fill: color,\n                        style: {\n                            filter: `drop-shadow(0 0 4px ${color})`,\n                            animation: `dotPulse 2.4s cubic-bezier(.4,0,.2,1) infinite`,\n                            animationDelay: `${delay}s`\n                        },\n                        className: \"jsx-bdcfdd39a4a343e0\"\n                    }, i, false, {\n                        fileName: \"/Users/jonathanreed/Downloads/AI-Provider-API-Latency-Tester/components/DotMatrixBackground.tsx\",\n                        lineNumber: 54,\n                        columnNumber: 13\n                    }, undefined);\n                })\n            }, void 0, false, {\n                fileName: \"/Users/jonathanreed/Downloads/AI-Provider-API-Latency-Tester/components/DotMatrixBackground.tsx\",\n                lineNumber: 42,\n                columnNumber: 7\n            }, undefined),\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)((styled_jsx_style__WEBPACK_IMPORTED_MODULE_1___default()), {\n                id: \"bdcfdd39a4a343e0\",\n                children: \"@-webkit-keyframes dotPulse{0%,100%{opacity:.7}50%{opacity:1}}@-moz-keyframes dotPulse{0%,100%{opacity:.7}50%{opacity:1}}@-o-keyframes dotPulse{0%,100%{opacity:.7}50%{opacity:1}}@keyframes dotPulse{0%,100%{opacity:.7}50%{opacity:1}}\"\n            }, void 0, false, void 0, undefined)\n        ]\n    }, void 0, true, {\n        fileName: \"/Users/jonathanreed/Downloads/AI-Provider-API-Latency-Tester/components/DotMatrixBackground.tsx\",\n        lineNumber: 37,\n        columnNumber: 5\n    }, undefined);\n};\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (DotMatrixBackground);\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9jb21wb25lbnRzL0RvdE1hdHJpeEJhY2tncm91bmQudHN4IiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFtRDtBQUVuRCx1QkFBdUI7QUFDdkIsTUFBTUcsUUFBUTtJQUNaO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0NBQ0Q7QUFFRCxNQUFNQyxXQUFXO0FBQ2pCLE1BQU1DLFVBQVU7QUFFaEIsU0FBU0MsUUFBUUMsR0FBVztJQUMxQixPQUFPSixLQUFLLENBQUNJLE1BQU1KLE1BQU1LLE1BQU0sQ0FBQztBQUNsQztBQUVBLE1BQU1DLHNCQUFnQztJQUNwQyxNQUFNLENBQUNDLFlBQVlDLGNBQWMsR0FBR1QsK0NBQVFBLENBQUM7UUFBRVUsT0FBTztRQUFNQyxRQUFRO0lBQUs7SUFFekVaLGdEQUFTQSxDQUFDO1FBQ1IsU0FBU2E7WUFDUEgsY0FBYztnQkFBRUMsT0FBT0csT0FBT0MsVUFBVTtnQkFBRUgsUUFBUUUsT0FBT0UsV0FBVztZQUFDO1FBQ3ZFO1FBQ0FIO1FBQ0FDLE9BQU9HLGdCQUFnQixDQUFDLFVBQVVKO1FBQ2xDLE9BQU8sSUFBTUMsT0FBT0ksbUJBQW1CLENBQUMsVUFBVUw7SUFDcEQsR0FBRyxFQUFFO0lBRUwsTUFBTU0sT0FBT0MsS0FBS0MsSUFBSSxDQUFDWixXQUFXRSxLQUFLLEdBQUdQO0lBQzFDLE1BQU1rQixPQUFPRixLQUFLQyxJQUFJLENBQUNaLFdBQVdHLE1BQU0sR0FBR1I7SUFFM0MscUJBQ0UsOERBQUNtQjtRQUNDQyxlQUFZO1FBRVpDLE9BQU87WUFBRUMsWUFBWTtZQUFRQyxVQUFVO1FBQVM7a0RBRHRDOzswQkFHViw4REFBQ0M7Z0JBQ0NqQixPQUFPRixXQUFXRSxLQUFLO2dCQUN2QkMsUUFBUUgsV0FBV0csTUFBTTtnQkFDekJhLE9BQU87b0JBQUVJLFVBQVU7b0JBQVlDLEtBQUs7b0JBQUdDLE1BQU07b0JBQUdDLFNBQVM7Z0JBQUs7OzBCQUU3REMsTUFBTUMsSUFBSSxDQUFDO29CQUFFM0IsUUFBUWUsT0FBT0g7Z0JBQUssR0FBR2dCLEdBQUcsQ0FBQyxDQUFDQyxHQUFHQztvQkFDM0MsTUFBTUMsTUFBTWxCLEtBQUttQixLQUFLLENBQUNGLElBQUlsQjtvQkFDM0IsTUFBTXFCLE1BQU1ILElBQUlsQjtvQkFDaEIsTUFBTXNCLFFBQVFwQyxRQUFRZ0MsSUFBSUM7b0JBQzFCLDJDQUEyQztvQkFDM0MsTUFBTUksUUFBUSxDQUFFSixNQUFNRSxHQUFFLElBQUssSUFBSztvQkFDbEMscUJBQ0UsOERBQUNHO3dCQUVDQyxJQUFJSixNQUFNcEMsVUFBVUEsVUFBVTt3QkFDOUJ5QyxJQUFJUCxNQUFNbEMsVUFBVUEsVUFBVTt3QkFDOUIwQyxHQUFHM0MsV0FBVzt3QkFDZDRDLE1BQU1OO3dCQUNOaEIsT0FBTzs0QkFDTHVCLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRVAsTUFBTSxDQUFDLENBQUM7NEJBQ3ZDUSxXQUFXLENBQUMsOENBQThDLENBQUM7NEJBQzNEQyxnQkFBZ0IsQ0FBQyxFQUFFUixNQUFNLENBQUMsQ0FBQzt3QkFDN0I7O3VCQVRLTDs7Ozs7Z0JBWVg7Ozs7Ozs7Ozs7Ozs7Ozs7QUFVUjtBQUVBLGlFQUFlN0IsbUJBQW1CQSxFQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vYWktY29tcGFyYXRvci8uL2NvbXBvbmVudHMvRG90TWF0cml4QmFja2dyb3VuZC50c3g/NGU3ZiJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUmVhY3QsIHsgdXNlRWZmZWN0LCB1c2VTdGF0ZSB9IGZyb20gXCJyZWFjdFwiO1xuXG4vLyBHcmV5c2NhbGUgZG90IGNvbG9yc1xuY29uc3QgR1JFWVMgPSBbXG4gIFwiIzIyMlwiLFxuICBcIiMzMzNcIixcbiAgXCIjNDQ0XCIsXG4gIFwiIzY2NlwiLFxuICBcIiM4ODhcIixcbiAgXCIjYWFhXCIsXG4gIFwiI2NjY1wiXG5dO1xuXG5jb25zdCBET1RfU0laRSA9IDY7XG5jb25zdCBET1RfR0FQID0gMjA7XG5cbmZ1bmN0aW9uIGdldEdyZXkoaWR4OiBudW1iZXIpIHtcbiAgcmV0dXJuIEdSRVlTW2lkeCAlIEdSRVlTLmxlbmd0aF07XG59XG5cbmNvbnN0IERvdE1hdHJpeEJhY2tncm91bmQ6IFJlYWN0LkZDID0gKCkgPT4ge1xuICBjb25zdCBbZGltZW5zaW9ucywgc2V0RGltZW5zaW9uc10gPSB1c2VTdGF0ZSh7IHdpZHRoOiAxOTIwLCBoZWlnaHQ6IDEwODAgfSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBmdW5jdGlvbiB1cGRhdGVTaXplKCkge1xuICAgICAgc2V0RGltZW5zaW9ucyh7IHdpZHRoOiB3aW5kb3cuaW5uZXJXaWR0aCwgaGVpZ2h0OiB3aW5kb3cuaW5uZXJIZWlnaHQgfSk7XG4gICAgfVxuICAgIHVwZGF0ZVNpemUoKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCB1cGRhdGVTaXplKTtcbiAgICByZXR1cm4gKCkgPT4gd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgdXBkYXRlU2l6ZSk7XG4gIH0sIFtdKTtcblxuICBjb25zdCBjb2xzID0gTWF0aC5jZWlsKGRpbWVuc2lvbnMud2lkdGggLyBET1RfR0FQKTtcbiAgY29uc3Qgcm93cyA9IE1hdGguY2VpbChkaW1lbnNpb25zLmhlaWdodCAvIERPVF9HQVApO1xuXG4gIHJldHVybiAoXG4gICAgPGRpdlxuICAgICAgYXJpYS1oaWRkZW49XCJ0cnVlXCJcbiAgICAgIGNsYXNzTmFtZT1cImZpeGVkIGluc2V0LTAgdy1mdWxsIGgtZnVsbCB6LTAgcG9pbnRlci1ldmVudHMtbm9uZSBzZWxlY3Qtbm9uZVwiXG4gICAgICBzdHlsZT17eyBiYWNrZ3JvdW5kOiBcIiMwMDBcIiwgb3ZlcmZsb3c6IFwiaGlkZGVuXCIgfX1cbiAgICA+XG4gICAgICA8c3ZnXG4gICAgICAgIHdpZHRoPXtkaW1lbnNpb25zLndpZHRofVxuICAgICAgICBoZWlnaHQ9e2RpbWVuc2lvbnMuaGVpZ2h0fVxuICAgICAgICBzdHlsZT17eyBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLCB0b3A6IDAsIGxlZnQ6IDAsIG9wYWNpdHk6IDAuMTggfX1cbiAgICAgID5cbiAgICAgICAge0FycmF5LmZyb20oeyBsZW5ndGg6IHJvd3MgKiBjb2xzIH0pLm1hcCgoXywgaSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHJvdyA9IE1hdGguZmxvb3IoaSAvIGNvbHMpO1xuICAgICAgICAgIGNvbnN0IGNvbCA9IGkgJSBjb2xzO1xuICAgICAgICAgIGNvbnN0IGNvbG9yID0gZ2V0R3JleShpICsgcm93KTtcbiAgICAgICAgICAvLyBPcHRpb25hbGx5IGFuaW1hdGUgd2l0aCBhIHN1YnRsZSBwdWxzYXRlXG4gICAgICAgICAgY29uc3QgZGVsYXkgPSAoKHJvdyArIGNvbCkgJSA3KSAqIDAuMjtcbiAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgPGNpcmNsZVxuICAgICAgICAgICAgICBrZXk9e2l9XG4gICAgICAgICAgICAgIGN4PXtjb2wgKiBET1RfR0FQICsgRE9UX0dBUCAvIDJ9XG4gICAgICAgICAgICAgIGN5PXtyb3cgKiBET1RfR0FQICsgRE9UX0dBUCAvIDJ9XG4gICAgICAgICAgICAgIHI9e0RPVF9TSVpFIC8gMn1cbiAgICAgICAgICAgICAgZmlsbD17Y29sb3J9XG4gICAgICAgICAgICAgIHN0eWxlPXt7XG4gICAgICAgICAgICAgICAgZmlsdGVyOiBgZHJvcC1zaGFkb3coMCAwIDRweCAke2NvbG9yfSlgLFxuICAgICAgICAgICAgICAgIGFuaW1hdGlvbjogYGRvdFB1bHNlIDIuNHMgY3ViaWMtYmV6aWVyKC40LDAsLjIsMSkgaW5maW5pdGVgLFxuICAgICAgICAgICAgICAgIGFuaW1hdGlvbkRlbGF5OiBgJHtkZWxheX1zYCxcbiAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgKTtcbiAgICAgICAgfSl9XG4gICAgICA8L3N2Zz5cbiAgICAgIDxzdHlsZSBqc3ggZ2xvYmFsPntgXG4gICAgICAgIEBrZXlmcmFtZXMgZG90UHVsc2Uge1xuICAgICAgICAgIDAlLCAxMDAlIHsgb3BhY2l0eTogMC43OyB9XG4gICAgICAgICAgNTAlIHsgb3BhY2l0eTogMTsgfVxuICAgICAgICB9XG4gICAgICBgfTwvc3R5bGU+XG4gICAgPC9kaXY+XG4gICk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBEb3RNYXRyaXhCYWNrZ3JvdW5kO1xuIl0sIm5hbWVzIjpbIlJlYWN0IiwidXNlRWZmZWN0IiwidXNlU3RhdGUiLCJHUkVZUyIsIkRPVF9TSVpFIiwiRE9UX0dBUCIsImdldEdyZXkiLCJpZHgiLCJsZW5ndGgiLCJEb3RNYXRyaXhCYWNrZ3JvdW5kIiwiZGltZW5zaW9ucyIsInNldERpbWVuc2lvbnMiLCJ3aWR0aCIsImhlaWdodCIsInVwZGF0ZVNpemUiLCJ3aW5kb3ciLCJpbm5lcldpZHRoIiwiaW5uZXJIZWlnaHQiLCJhZGRFdmVudExpc3RlbmVyIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImNvbHMiLCJNYXRoIiwiY2VpbCIsInJvd3MiLCJkaXYiLCJhcmlhLWhpZGRlbiIsInN0eWxlIiwiYmFja2dyb3VuZCIsIm92ZXJmbG93Iiwic3ZnIiwicG9zaXRpb24iLCJ0b3AiLCJsZWZ0Iiwib3BhY2l0eSIsIkFycmF5IiwiZnJvbSIsIm1hcCIsIl8iLCJpIiwicm93IiwiZmxvb3IiLCJjb2wiLCJjb2xvciIsImRlbGF5IiwiY2lyY2xlIiwiY3giLCJjeSIsInIiLCJmaWxsIiwiZmlsdGVyIiwiYW5pbWF0aW9uIiwiYW5pbWF0aW9uRGVsYXkiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./components/DotMatrixBackground.tsx\n");

/***/ }),

/***/ "./pages/_app.tsx":
/*!************************!*\
  !*** ./pages/_app.tsx ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../styles/globals.css */ \"./styles/globals.css\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_styles_globals_css__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _components_DotMatrixBackground__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../components/DotMatrixBackground */ \"./components/DotMatrixBackground.tsx\");\n\n\n\nfunction MyApp({ Component, pageProps }) {\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.Fragment, {\n        children: [\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_DotMatrixBackground__WEBPACK_IMPORTED_MODULE_2__[\"default\"], {}, void 0, false, {\n                fileName: \"/Users/jonathanreed/Downloads/AI-Provider-API-Latency-Tester/pages/_app.tsx\",\n                lineNumber: 8,\n                columnNumber: 7\n            }, this),\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n                ...pageProps\n            }, void 0, false, {\n                fileName: \"/Users/jonathanreed/Downloads/AI-Provider-API-Latency-Tester/pages/_app.tsx\",\n                lineNumber: 9,\n                columnNumber: 7\n            }, this)\n        ]\n    }, void 0, true);\n}\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (MyApp);\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9wYWdlcy9fYXBwLnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQStCO0FBRXFDO0FBRXBFLFNBQVNDLE1BQU0sRUFBRUMsU0FBUyxFQUFFQyxTQUFTLEVBQVk7SUFDL0MscUJBQ0U7OzBCQUNFLDhEQUFDSCx1RUFBbUJBOzs7OzswQkFDcEIsOERBQUNFO2dCQUFXLEdBQUdDLFNBQVM7Ozs7Ozs7O0FBRzlCO0FBRUEsaUVBQWVGLEtBQUtBLEVBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9haS1jb21wYXJhdG9yLy4vcGFnZXMvX2FwcC50c3g/MmZiZSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgJy4uL3N0eWxlcy9nbG9iYWxzLmNzcyc7XG5pbXBvcnQgdHlwZSB7IEFwcFByb3BzIH0gZnJvbSAnbmV4dC9hcHAnO1xuaW1wb3J0IERvdE1hdHJpeEJhY2tncm91bmQgZnJvbSAnLi4vY29tcG9uZW50cy9Eb3RNYXRyaXhCYWNrZ3JvdW5kJztcblxuZnVuY3Rpb24gTXlBcHAoeyBDb21wb25lbnQsIHBhZ2VQcm9wcyB9OiBBcHBQcm9wcykge1xuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8RG90TWF0cml4QmFja2dyb3VuZCAvPlxuICAgICAgPENvbXBvbmVudCB7Li4ucGFnZVByb3BzfSAvPlxuICAgIDwvPlxuICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBNeUFwcDtcbiJdLCJuYW1lcyI6WyJEb3RNYXRyaXhCYWNrZ3JvdW5kIiwiTXlBcHAiLCJDb21wb25lbnQiLCJwYWdlUHJvcHMiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./pages/_app.tsx\n");

/***/ }),

/***/ "./styles/globals.css":
/*!****************************!*\
  !*** ./styles/globals.css ***!
  \****************************/
/***/ (() => {



/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "react" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("react");

/***/ }),

/***/ "react/jsx-dev-runtime":
/*!****************************************!*\
  !*** external "react/jsx-dev-runtime" ***!
  \****************************************/
/***/ ((module) => {

"use strict";
module.exports = require("react/jsx-dev-runtime");

/***/ }),

/***/ "styled-jsx/style":
/*!***********************************!*\
  !*** external "styled-jsx/style" ***!
  \***********************************/
/***/ ((module) => {

"use strict";
module.exports = require("styled-jsx/style");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__("./pages/_app.tsx"));
module.exports = __webpack_exports__;

})();