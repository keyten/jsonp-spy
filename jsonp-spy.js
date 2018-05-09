(function () {
    var documentCreateElement = document.createElement;
    var waitings = {};

    function fakeCreateElement(name){
        var element = documentCreateElement.apply(document, arguments);
        var elementSetAttribute = element.setAttribute;

        if (name !== 'script') {
            return element;
        }

        var src = '';
        Object.defineProperty(element, 'src', {
            enumerable: false,
            get: function () {
                return src;
            },
            set: function (value) {
                var waiting = findWaiting(value);
                if (waiting) {
                    var callbackName = getUrlParam(value, waiting.callbackProp);
                    if (!callbackName) {
                        return;
                    }
                    window[callbackName](waiting.returnValue);
                } else {
                    elementSetAttribute.call(element, 'src', value);
                }
                src = value;
            }
        });

        element.setAttribute = function (attribute, value) {
            src = value;

            var waiting;

            if (attribute === 'src') {
                waiting = findWaiting(value);
                if (waiting) {
                    var callbackName = getUrlParam(value, waiting.callbackProp);
                    if (!callbackName) {
                        return;
                    }
                    window[callbackName](waiting.returnValue);
                    return;
                }
            }
            return elementSetAttribute.apply(element, arguments);
        };

        return element;
    }

    function spyJSONP(url, callbackProp, returnValue, ignoreParams) {
        url = sortUrlParams(removeUrlParams(url, ignoreParams));
        waitings[url] = {
            returnValue: returnValue,
            callbackProp: callbackProp,
            ignoreParams: ignoreParams || {}
        };
        document.createElement = fakeCreateElement;
    }

    function reset(){
        document.createElement = documentCreateElement;
        waitings = {};
    }

    spyJSONP.reset = reset;

    function findWaiting(url) {
        url = sortUrlParams(url);
        var result;
        var current;

        return Object.keys(waitings).some(function (key) {
            current = removeUrlParams(url, waitings[key].ignoreParams);
            if (current === key) {
                result = waitings[key];
                return true;
            }
            return false;
        }) ? result : null;
    }

    // url utilities
    function getUrlParam(url, param) {
        var paramValue;
        url = url.split('?')[1];
        url = url.split('&');
        return url.some(function (part) {
            part = part.split('=');
            if (part[0] === param) {
                paramValue = part[1];
                return true;
            }
            return false;
        }) ? paramValue : null;
    }

    function sortUrlParams(url){
        url = url.split('?');
        if (!url[1]) {
            return url[0];
        }

        var query = url[1].split('&');

        query.sort(function(a, b) {
            return a.split('=')[0] > b.split('=')[0];
        });

        return url[0] + '?' + query.join('&');
    }

    function removeUrlParams(url, params) {
        url = url.split('?');
        if (!url[1]) {
            return url[0];
        }

        var query = url[1].split('&');

        for (var i = 0; i < query.length; i++) {
            if (params.indexOf(query[i].split('=')[0]) > -1) {
                query.splice(i, 1);
                i--;
            }
        }

        return url[0] + '?' + query.join('&');
    }

    window.spyJSONP = spyJSONP;
})();
