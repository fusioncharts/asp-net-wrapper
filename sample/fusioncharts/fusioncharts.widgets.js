/**
 * @private
 * @module fusioncharts.renderer.javascript.datastreamer.logger
 */
/* jshint camelcase: false */
FusionCharts.register('module', ['private', 'modules.renderer.js-messagelogger',
    function () {

        var global = this,
            lib = global.hcLib,
            R = lib.Raphael,
            MessageLogger,

            isIE = lib.isIE,
            hex2rgb = lib.graphics.HEXtoRGB,
            convertColor = lib.graphics.convertColor,

            showRTMenuItem,

            useMessageLog,
            messageGoesToLog,
            messageLogWPercent,
            messageLogHPercent,
            messageLogShowTitle,
            messageLogTitle,
            messageLogColor,
            messageLogColor_rgb,
            messageGoesToJS,
            messageJSHandler,
            messagePassAllToJS,
            messageLogIsCancelable,
            alwaysShowMessageLogMenu,

            createHTMLDialogue,
            win = global.window,
            doc = win.document,
            docmode8 = doc.documentMode === 8,

            scrollToBottom = true,
            dynamicScrolling = false,

            pluck = lib.pluck,
            pluckNumber = lib.pluckNumber,

            PX = 'px',
            CONFIGKEY = lib.FC_CONFIG_STRING,

            LITERAL_TITLE_COLOR = '#005900',
            INFO_TITLE_COLOR = '#005900',
            ERROR_TITLE_COLOR = '#CC0000',
            LINK_TITLE_COLOR = '#005900',

            TITLE_HASH_STRING = '$titleVal$',
            MSG_HASH_STRING = '$msgVal$',

            CONTAINER_SPAN_STYLE = {
                display: 'block',
                paddingLeft: '10px',
                'paddingRight': '10px',
                'font-family': 'Arial',
                'font-size': '11px'
            },

            LITERAL_SPAN = '<span style="color: ' + LITERAL_TITLE_COLOR + '">' + TITLE_HASH_STRING + '</span>',
            INFO_SPAN = '<span style="color: ' + INFO_TITLE_COLOR + '">' + TITLE_HASH_STRING + '</span>',
            ERROR_SPAN = '<span style="color: ' + ERROR_TITLE_COLOR + '">' + TITLE_HASH_STRING + '</span>',
            LINK_SPAN = '<span style="color: ' + LINK_TITLE_COLOR + '">' + TITLE_HASH_STRING + '</span>',
            ERROR_MSG_SPAN = '<span style="color: ' + ERROR_TITLE_COLOR + '">' + MSG_HASH_STRING + '</span>',
            LINK_MSG_SPAN = '<a href="' + MSG_HASH_STRING + '">' + MSG_HASH_STRING + '</a>',
            MSG_SPAN = '<span>' + MSG_HASH_STRING + '</span>',

            replaceAll = function (StringToFind, stringToReplace) {
                var temp = this,
                    index;

                stringToReplace || (stringToReplace = '');

                index = temp.indexOf(StringToFind);
                while (index !== -1) {
                    temp = temp.replace(StringToFind, stringToReplace);
                    index = temp.indexOf(StringToFind);
                }

                return temp;
            };


        createHTMLDialogue = function (iApi, renderer, paper) {
            var hcJSON = iApi.hcJSON,
                conf = hcJSON && hcJSON[CONFIGKEY],
                inCanvasStyle = (conf && conf.inCanvasStyle) || iApi.inCanvasStyle,
                container = renderer && renderer.container,
                chartWidth = renderer && renderer.chartWidth,
                chartHeight = renderer && renderer.chartHeight,
                //properties to configure the close button
                close_paper,
                cg,
                closeBtnRadius = 6,
                closeBtnContainerWidth = closeBtnRadius * 3,
                closeBtnContainerHeight = closeBtnRadius * 3,
                closeBtnBorderColor = '999999',
                closeBtnHalfRadius = closeBtnRadius / 2,
                closeBtnXPos = closeBtnContainerWidth / 2,
                //(dialogXPos + dialogWidth) + closeBtnHalfRadius + closeBtnBorderThickness,
                closeBtnYPos = closeBtnContainerHeight / 2,
                //dialogYPos - closeBtnHalfRadius + closeBtnBorderThickness,

                hPadding = 5 + closeBtnRadius,
                vPadding = 5 + closeBtnRadius,
                dialogWidth = chartWidth * (messageLogWPercent / 100), //chartWidth - (hPadding * 2),
                dialogHeight = chartHeight * (messageLogHPercent / 100), //chartHeight - (vPadding * 2),
                dialogXPos = (chartWidth - dialogWidth) / 2,
                dialogYPos = (chartHeight - dialogHeight) / 2,
                textAreaWidth = dialogWidth - closeBtnContainerWidth - (hPadding * 2),
                textAreaHeight = dialogHeight - closeBtnContainerHeight - (vPadding * 2),
                veilBgColor = '000000',
                dialogBgColor = 'ffffff',
                dialogStrokeColor = messageLogColor,
                logBGColor = messageLogColor,
                ui,
                rgbStr,
                rgbaStr;


            ui = paper.html('div', {
                fill: 'transparent',
                width: chartWidth,
                height: chartHeight
            }, {
                fontSize: 10 + PX,
                lineHeight: 15 + PX,
                fontFamily: inCanvasStyle.fontFamily
            }, container);

            ui.veil = paper.html('div', {
                id: 'veil',
                fill: veilBgColor,
                width: chartWidth,
                height: chartHeight,
                opacity: 0.1
            }, undefined, ui)
                .on('click', function () {
                    messageLogIsCancelable && lib.messageLogger.close();
                });

            //if message log title is available
            //Create title
            /** @todo: in IE title becomes too big. */
            if (messageLogTitle && messageLogShowTitle) {
                ui.title = paper.html('p', {
                    id: 'Title',
                    innerHTML: messageLogTitle,
                    x: 5,
                    y: 5
                }, {
                    'font-weight': 'bold'
                }, ui);
            }

            ui.dialog = paper.html('div', {
                id: 'dialog',
                x: dialogXPos,
                y: dialogYPos,
                fill: dialogBgColor,
                strokeWidth: 1,
                stroke: dialogStrokeColor,
                width: dialogWidth,
                height: dialogHeight
            }, {
                borderRadius: 5 + PX,
                boxShadow: '1px 1px 3px #000000',
                '-webkit-border-radius': 5 + PX,
                '-webkit-box-shadow': '1px 1px 3px #000000',
                filter: 'progid:DXImageTransform.Microsoft.Shadow(Strength=4, Direction=135, Color="#000000")'
            }, ui);


            rgbStr = 'rgb(' + messageLogColor_rgb[0] + ',' + messageLogColor_rgb[1] +
                ',' + messageLogColor_rgb[2] + ')';
            rgbaStr = 'rgba(' + messageLogColor_rgb[0] + ',' + messageLogColor_rgb[1] +
                ',' + messageLogColor_rgb[2] + ',' + 0.1 + ')';

            ui.logBackground = paper.html('div', {
                id: 'dialogBackground',
                x: 0,
                y: 0,
                fill: logBGColor,
                width: dialogWidth,
                height: dialogHeight
            }, undefined, ui.dialog);

            //create close button if required
            if (messageLogIsCancelable) {
                //In order to create a close button icon for message Logger
                //we need to initiate a separate raphael instance on the messageLogger
                //div
                ui.closeBtnContainer = paper.html('div', {
                    id: 'closeBtnContainer',
                    width: closeBtnContainerWidth,
                    height: closeBtnContainerHeight,
                    x: (dialogXPos + dialogWidth) -
                        (closeBtnContainerWidth + closeBtnHalfRadius), //half radius used as padding
                    y: dialogYPos + closeBtnHalfRadius
                }, {
                    //'background-color': 'rgba(0, 0, 0, 0.4)'
                }, ui);

                close_paper = new R('closeBtnContainer', closeBtnContainerWidth, closeBtnContainerWidth);
                cg = close_paper.group('closeGroup');
                ui.closeButton = close_paper.symbol('closeIcon', 0, 0, closeBtnRadius, cg)
                    .attr({
                        transform: 't' + closeBtnXPos + ',' + closeBtnYPos,
                        'stroke-width': 2,
                        //fill: convertColor(closeBtnFillColor),
                        stroke: convertColor(closeBtnBorderColor),
                        ishot: true,
                        'stroke-linecap': 'round',
                        'stroke-linejoin': 'round'
                    })
                    .css({
                        cursor: 'pointer',
                        _cursor: 'hand'
                    })
                    .click(function () {
                        lib.messageLogger.close();
                    });
            }

            ui.logWrapper = paper.html('div', {
                id: 'logWrapper',
                x: (dialogWidth - textAreaWidth) / 2,
                y: (dialogHeight - textAreaHeight) / 2,
                width: textAreaWidth,
                height: textAreaHeight
            }, {
                overflow: 'auto'
            }, ui.dialog)
                .on('scroll', function () {
                    var wrapper = this,
                        scrollTop = wrapper && wrapper.scrollTop,
                        scrollHeight = wrapper && wrapper.scrollHeight,
                        wrapperHeight = wrapper && wrapper.offsetHeight;

                    if (dynamicScrolling) {
                        dynamicScrolling = false;
                        return;
                    }
                    //manual scrolling set auto scrolling bottom to false.
                    //if the scroller is not scrolled to bottom.
                    //This will prevent the scroller automatically jumping
                    //to end when user wants to see a specific area
                    scrollToBottom = ((scrollHeight - scrollTop) === wrapperHeight) ?
                        true : false;

                });



            ui.log = paper.html('div', {
                id: 'log',
                x: 0,
                y: 0
                //opacity: 1
            }, {}, ui.logWrapper);

            //initially hide
            ui.hide();
            return ui;
        };

        function createMessage(msgObj, parentElem) {
            var msgTitle = msgObj && msgObj.msgtitle,
                msgText = msgObj && msgObj.msgtext,
                msgSeparator = ' : ',
                msgType = msgObj && pluck(msgObj.msgtype, 'literal'),
                titleHTML,
                msgHTML,
                totalHTML = '',
                group,
                parentSpan,
                logWrapper,
                scrollHeight,
                prop,
                temp;

            //decode URL encoded text
            //FWXT-860 - URL encoding is not encouraged as there it might change
            //as per codepage.
            /* msgText &&
                (msgText = decodeURIComponent(msgText.replace(/\+/g, ' ')));
        msgTitle &&
                (msgTitle = decodeURIComponent(msgTitle.replace(/\+/g, ' '))); */

            parentElem && parentElem.element && (group = parentElem.element);

            group && (logWrapper = group.parentElement);

            //add title and msg separator
            /** @todo: here we need to check whether we actually need to insert the
             * separator. Client could provide formatted string.
             * RegEx could be used. */
            msgTitle && (msgTitle += msgSeparator);


            switch (msgType.toLowerCase()) {
            case 'info':
                msgTitle && (titleHTML = INFO_SPAN);
                msgText && (msgHTML = MSG_SPAN);
                break;
            case 'literal':
                msgTitle && (titleHTML = LITERAL_SPAN);
                msgText && (msgHTML = MSG_SPAN);
                break;
            case 'error':
                msgTitle && (titleHTML = ERROR_SPAN);
                msgText && (msgHTML = ERROR_MSG_SPAN);
                break;
            case 'link':
                msgTitle && (titleHTML = LINK_SPAN);
                msgText && (msgHTML = LINK_MSG_SPAN);
                break;
            default:
                msgTitle && (titleHTML = LITERAL_SPAN);
                msgText && (msgHTML = MSG_SPAN);
            }

            if (titleHTML) {
                titleHTML = titleHTML.replace(TITLE_HASH_STRING, msgTitle);
                totalHTML += titleHTML;
            }

            if (msgHTML) {
                msgHTML = replaceAll.call(msgHTML, MSG_HASH_STRING, msgText);
                totalHTML += msgHTML;
            }

            if (group && totalHTML) {
                /** @todo: this line generats errors (randomly on resize) on IE 7 (spoon.net) */
                parentSpan = doc.createElement('span');

                //apply all style
                for (prop in CONTAINER_SPAN_STYLE) {
                    parentSpan.style[prop] = CONTAINER_SPAN_STYLE[prop];
                }
                parentSpan.innerHTML = totalHTML;
                group.appendChild && group.appendChild(parentSpan);

                //IE 8 erratically fails to renders child elements in the log divs.
                //Inspection reveals that there is no problem in appending the
                //elements and they gets rendered some time later as a whole.
                //This could be an issue related to what style
                //attributes (display & visibility) are used for showing or hiding
                //the div. The follwoing checks fix the issue -
                if (isIE && docmode8) {
                    temp = group.innerHTML;
                    group.innerHTML = temp;
                }
                //auto scrolling to bottom
                if (scrollToBottom) {
                    //set the dynamic scrolling flag to true
                    dynamicScrolling = true;
                    scrollHeight = logWrapper.scrollHeight;
                    logWrapper.scrollTop = scrollHeight;
                }

            }

        }

        MessageLogger = function (chart, instanceAPI, renderer, paper) {
            var ui;
            //no need to create multiple message logger. Singleton.
            if (lib.messageLogger) {
                return lib.messageLogger;
            }

            this.chart = chart;
            this.instanceAPI = instanceAPI;
            this.renderer = renderer;
            this.paper = paper;

            //flag to check whether log menu is created
            this.menuCreated = false;

            //we need to create the html dialogue box for logger
            ui = this.ui = createHTMLDialogue(instanceAPI, renderer, paper);
            //this.textArea = ui && ui.textArea && ui.textArea.element;
            this.log = ui && ui.log;

            ui && this.updateStatus('INITIALIZED');

        };

        MessageLogger.prototype = {

            STATUS: '',

            /** @todo: need to figure out getter / setter method */
            updateStatus: function (newStatus) {
                var renderer = this.renderer,
                    menu = renderer && (renderer.menu instanceof Array) && renderer.menu[0];

                //unified scope to extend to events if required.
                this.status = newStatus;
                //need to update menu buttons as well
                switch (menu && this.status.toLowerCase()) {
                case 'initialized':
                    //showRTMenuItem ? menu.hideItem(3) : menu.hideItem(0);
                    showRTMenuItem ? menu.hideItem(4) : menu.hideItem(1);
                    break;
                case 'closed':
                    //active show log option
                    showRTMenuItem ? menu.showItem(3) : menu.showItem(0);
                    showRTMenuItem ? menu.hideItem(4) : menu.hideItem(1);
                    break;
                case 'active':
                    showRTMenuItem ? menu.showItem(4) : menu.showItem(1);
                    showRTMenuItem ? menu.hideItem(3) : menu.hideItem(0);
                    break;
                default:
                    //do nothing;
                }

            },

            //append the new message or listen to the new instruction from server or
            //JS - API.
            //note: Any command or instruction from the server has the highest priority
            appendMessage: function (msgObj) {
                var presentState = this.status,
                    msgId = pluck(msgObj.msgid, ''),
                    title = pluck(msgObj.msgtitle, ''),
                    msg = pluck(msgObj.msgtext, ''),
                    msgType = msgObj && pluck(msgObj.msgtype, 'literal'),
                    clearLog = msgObj && !! (pluckNumber(msgObj.clearlog, 0)),
                    hideLog = msgObj && !! (pluckNumber(msgObj.hidelog, 0)),
                    showLog = msgObj && !! (pluckNumber(msgObj.showlog, 0)),
                    msgGoesToLog = msgObj && !! (pluckNumber(msgObj.msggoestolog, messageGoesToLog)),
                    msgGoesToJS = msgObj && !! (pluckNumber(msgObj.msggoestojs, messageGoesToJS)),
                    globalJSFunc;

                //for the first message update the status with default close
                if (msgGoesToLog && presentState === 'INITIALIZED') {
                    this.updateStatus('CLOSED');
                }

                //giving commands from the server as highest priority.
                hideLog && this.close();

                clearLog && this.clear();

                showLog && this.open();

                //do not show if global option to log is false
                (msgGoesToLog && this.status !== 'ACTIVE') && this.show();

                if (((title !== '' && title !== undefined) ||
                    (msg !== '' && msg !== undefined)) && this.log && msgGoesToLog) {
                    createMessage(msgObj, this.log);
                    //scroll to bottom
                    //Should scroll to bottom only when user has scrolled to bottom manumally.
                    if (!isIE) {
                        this.ui.element.scrollHeight += 30; /** @todo: need to be a dynamic value */
                        this.ui.element.scrollTop = this.ui.element.scrollHeight;
                    }
                }

                //now if we need to bypass this function to JS api, call the defined
                //JS method.
                /** @todo: check to see scope mangement (specially IE) */
                if (msgGoesToJS && messageJSHandler) {
                    globalJSFunc = win[messageJSHandler];
                    if (typeof globalJSFunc === 'function') {
                        //check whether all parameters are to be passed.
                        //@note: the order of the attributes are fixed. This could be
                        //made dynamic through passing a whole objcet.
                        messagePassAllToJS ? globalJSFunc(msgId, title, msg, msgType) : globalJSFunc(msg);
                    }
                }


            },

            hide: function () {
                if (this.status === 'ACTIVE') {
                    this.ui.hide();
                    this.updateStatus('BEFORE CLOSE'); // before close
                }

            },

            //close is differnt than hide in the sense
            //close is user initiated action.
            close: function () {
                if (this.status === 'ACTIVE') {
                    this.ui.hide();
                    this.updateStatus('CLOSED');
                }
            },

            //open is differnt than show in the sense
            //open is user initiated action.
            open: function () {
                if (this.status !== 'ACTIVE') {
                    this.ui.show();
                    this.updateStatus('ACTIVE');
                }
            },

            show: function () {
                if (this.status !== 'ACTIVE' && this.status !== 'CLOSED') {
                    this.ui.show();
                    this.updateStatus('ACTIVE');
                }
            },

            clear: function () {
                var logDiv = this.log,
                    group = logDiv && logDiv.element;

                if (group) {
                    while (group.hasChildNodes()) {
                        group.removeChild(group.lastChild);
                    }
                }
            },

            destroy: function () {
                //hide the message logger if open
                this.hide();
                //now destroy
                this.updateStatus('DESTROYED');
                //remove global references
                lib.messageLogger = null;
                delete lib.messageLogger;
                //return null in case someone alo wants to
                //update the instance variable.
                return null;
            }


        };

        MessageLogger.prototype.constructor = MessageLogger;


        //We need to first subscribe to the rendered event and for each data update
        //we need to validate whether message logger is needed as well as on each
        //resize event we need to maintain states.
        //we need to check whether the current data require message logger.
        global.core.addEventListener(['rendered', 'dataupdated', 'resized'], function (event) {
            var chart = event && event.sender,
                eventType = event && event.eventType,
                jsVars = chart && chart.jsVars,
                hcObj = jsVars && jsVars.hcObj,
                options = hcObj && hcObj.options,
                iApi = jsVars && jsVars.instanceAPI,
                renderer = iApi && iApi.renderer,
                paper = renderer && renderer.paper,
                chartParameters = options && options.chart,
                chartOptions = chart && chart.options,
                rendererType = chartOptions && chartOptions.renderer,
                messageLogger = lib && lib.messageLogger,
                prevStatus = messageLogger && messageLogger.status,

                reflowData = jsVars && jsVars._reflowData,
                reflowMSGLogger = reflowData && reflowData._messageLogger || {},
                loggedMSGElems = reflowMSGLogger &&
                    reflowMSGLogger.appendedMessages,
                logElement;

            //no need to proceed further if this is not a javascript chart
            if (rendererType && rendererType.toLowerCase() !== 'javascript') {
                return;
            }

            //check whether messageLogger is needed.
            useMessageLog = chartParameters && chartParameters.useMessageLog;
            //if no logger needed get out of here.
            if (!useMessageLog) {
                return;
            }

            //get chart level attributes
            if (chartParameters) {
                showRTMenuItem = chartParameters.showRTMenuItem;

                messageGoesToLog = chartParameters.messageGoesToLog;
                messageGoesToJS = chartParameters.messageGoesToJS;
                messageJSHandler = chartParameters.messageJSHandler;
                messagePassAllToJS = chartParameters.messagePassAllToJS;
                messageLogWPercent = chartParameters.messageLogWPercent;
                messageLogHPercent = chartParameters.messageLogHPercent;
                messageLogShowTitle = chartParameters.messageLogShowTitle;
                messageLogTitle = chartParameters.messageLogTitle;
                messageLogIsCancelable = chartParameters.messageLogIsCancelable;
                messageLogColor = chartParameters.messageLogColor;
                //convert messageLogColor to rgb
                messageLogColor = messageLogColor.replace(/^#?([a-f0-9]+)/ig, '$1'); // taken from gradientlegend.js
                messageLogColor_rgb = hex2rgb(messageLogColor);
                alwaysShowMessageLogMenu = chartParameters.alwaysShowMessageLogMenu;
            }

            //Remove any existing messageLogger
            if (messageLogger) {
                messageLogger = lib.messageLogger = messageLogger.destroy();
            }
            //create message logger
            messageLogger = lib.messageLogger = new MessageLogger(chart, iApi,
                renderer, paper);
            logElement = messageLogger && messageLogger.ui &&
                messageLogger.ui.log && messageLogger.ui.log.element;

            //in case of resize event we need to append the previously logged
            //messages and update to the last status
            if (eventType === 'resized') {
                loggedMSGElems && (logElement.innerHTML = loggedMSGElems);

                //update to previous status
                switch (prevStatus.toLowerCase()) {
                case 'active':
                    messageLogger.ui.show();
                    messageLogger.updateStatus(prevStatus);
                    break;
                case 'closed':
                    messageLogger.updateStatus(prevStatus);
                    break;
                default:
                    //do nothing
                }
            }

            //in case menu is already created update flag
            alwaysShowMessageLogMenu && (messageLogger.menuCreated = true);

            //now set the real time update event on this instance
            chart.addEventListener('RealTimeUpdateComplete', function (event, logObj) {
                var msgUpdateObj = logObj && logObj.updateObject,
                    msgTitle = msgUpdateObj && msgUpdateObj.msgtitle,
                    msgText = msgUpdateObj && msgUpdateObj.msgtext,
                    showLog = msgUpdateObj && pluckNumber(msgUpdateObj.showlog, 0),
                    hideLog = msgUpdateObj && pluckNumber(msgUpdateObj.hidelog, 0),
                    clearLog = msgUpdateObj && pluckNumber(msgUpdateObj.clearlog, 0);

                //do not proceed if nothing is there to update or execute
                if (!msgTitle && !msgText && !showLog && !hideLog && !clearLog) {
                    return;
                }

                //draw menu buttons only if it is not already drawn
                //this can only happen when useMesageLog is true
                //and RT menu option is disabled
                //but user does not want to show the logeer related menu
                //from begining. (alwaysShowMessageLogMenu = 0)
                if (useMessageLog && !showRTMenuItem && !alwaysShowMessageLogMenu && !messageLogger.menuCreated) {
                    iApi.drawMLMenuButtons.call(renderer, chart);
                    //create a flag that menu is created
                    messageLogger.menuCreated = true;
                }

                //append the message to the logger.
                messageLogger.appendMessage(msgUpdateObj);
                //store in the reflow object
                reflowMSGLogger.appendedMessages = logElement && logElement.innerHTML;
                reflowData._messageLogger = reflowMSGLogger;
            });

            //subscribe to the beforeDispose event to clear logger.
            chart.addEventListener('beforeDispose', function () {
                //before disposing the chart. Safely destroy the
                //message logger.
                messageLogger && messageLogger.destroy();
            });

        });
    }
]);
/**
 * @private
 *
 * @module fusioncharts.renderer.javascript.datastreamer
 * @requires fusioncharts.renderer.javascript.datastreamer.logger
 */
FusionCharts.register('module', ['private', 'modules.renderer.js-realtime', function () {

    var global = this,
        lib = global.hcLib,
        win = global.window,
        math = Math,
        mathRandom = math.random,
        mathMin = math.min,

        pluckNumber = lib.pluckNumber,

        THRESHOLD_MS = 10,
        IN_ALERT_RANGE = '1',
        OUT_OF_ALERT_RANGE = '2',
        ACTION_CALLJS = 'calljs',
        ACTION_SHOWANNOTATION = 'showannotation',

        /**
         * This function is to compact the routine of clearing and re-applying a timeout
         * @private
         *
         * @example
         * to = resetTimeout(theFunction, 500, to);
         *
         * @param {function} fn
         * @param {number} ms
         * @param {number} id
         * @returns {number}
         */
        resetTimeout = function (fn, ms, id) {
            clearTimeout(id);
            return setTimeout(fn, ms);
        },

        processAlerts, // fn
        processRealtimeStateChange; // fn

    /**
     * The alert manager listens to the data change events generated by the real-
     * time framework and the feedData method of the chart object. It gets the updated
     * values from the chart object and if the updated value lies within any of
     * the alert ranges, it performs the corresponding actions for that alert range.
     */
    processAlerts = function (event) {

        // Initialize the alert framework
        var chartObj = event.sender,
            vars = chartObj.jsVars,
            state = chartObj.__state,
            iapi = vars.instanceAPI,
            data = iapi.dataObj,
            alerts = data && data.alerts && data.alerts.alert || [],
            values = vars._rtLastUpdatedData && vars._rtLastUpdatedData.values,
            checkBounds, // function
            alertCount = alerts.length,
            dataCount,
            i;

        if (!values || !values.length) {
            return;
        }

        checkBounds = function (value) {
            var alertObj,
                alertAction,
                j,
                exacAlertParamFN = function () {
                    /* jshint evil:true */
                    eval(alertObj.param);
                    /* jshint evil:false */
                };

            for (j = 0; j < alertCount; j += 1) {
                alertObj = alerts[j];
                alertAction = alertObj.action && alertObj.action.toLowerCase();

                if (alertObj.minvalue < value && alertObj.maxvalue > value) {
                    if (!(alertObj.occuronce === '1' && alertObj.hasOccurred)) {

                        alertObj.hasOccurred = true;
                        alertObj.state = IN_ALERT_RANGE;

                        switch (alertAction) {
                            case ACTION_CALLJS:
                                setTimeout(exacAlertParamFN, 0);
                                break;

                            case ACTION_SHOWANNOTATION:
                                chartObj.showAnnotation &&
                                    chartObj.showAnnotation(alertObj.param);
                                break;
                        }

                        /**
                         * Fusion Charts has realtime updating charts under `PowerCharts XT`.
                         * These charts update at realtime reflecting the data changes immediately.
                         * This data can be monitored, in order to check if
                         * the value (after update) lies within or out of a given range using the AlertManager.
                         * If it lies within a particular range of interest to the user then
                         * the Alert Manager can perform some action as directed by the user.
                         *
                         * For example, if the real time data values cross a certain datarange, an alert
                         * can be raised to notify the user.
                         * The `alertComplete` event is fired when the alert is complete.
                         * When the JSON containing the data is passed to the {@link FusionCharts} object ,
                         * it should have the following to structure to provide for alerts.
                         *
                         * @event FusionCharts#alertComplete
                         * @group chart-realtime
                         *
                         * @example
                         * //An Example of the JSON structure for alert
                         *  var my-chart-data = {
                         *         'chart': {
                         *             'palette': '4',
                         *             'lowerlimit': '-50',
                         *             'upperlimit': '10',
                         *             'numbersuffix': '° C'
                         *             },
                         *             'value': '-40',
                         *             'alerts': {
                         *             'alert': [
                         *                 {
                         *                     'minvalue': '5',
                         *                     'maxvalue': '9',
                         *                     'action': 'callJS',
                         *                     'param': 'alert('Value between 5 and 9');'
                         *                 },
                         *                 {
                         *                     'maxvalue': '10',
                         *                     'action': 'showAnnotation',
                         *                     'param': 'statusRed',
                         *                     'occuronce': '0'
                         *                     }
                         *             ]
                         *         }
                         *   };
                         * //Once this structure is defined for the chart data, the `addEventListener` can be used to
                         * //listen to the `alertComplete` event .
                         *
                         * //Creating a thermometer chart.
                         * FusionCharts.addEventListener('ready', function () {
                         *     var chart = new FusionCharts({
                         *         id: 'thermometer'
                         *         type: 'thermometer',
                         *         renderAt: 'chart-container-div',
                         *         //The JSON as given above
                         *         dataSource: 'my-chart-data',
                         *         dataFormat: 'jsonurl'
                         *         }),
                         *         alertCount;
                         *
                         *     //rendering the chart to the div.
                         *     chart.render();
                         *
                         *     //Listening to the alertComplete event
                         *     chart.addEventListener('alertcomplete', function(){
                         *         alertCount++;
                         *     });
                         *
                         *     //Feeding data to trigger an alert.
                         *     chart.feedData(10);
                         * });
                         * //Refer to {@link http://docs.fusioncharts.com/widgets/} for further infomation on alerts.
                         */
                        global.raiseEvent('AlertComplete', null, alertObj);
                    }
                } else {
                    if (alertAction === ACTION_SHOWANNOTATION && alertObj.state === IN_ALERT_RANGE) {
                        chartObj.hideAnnotation &&
                            chartObj.hideAnnotation(alertObj.param);
                    }
                    // Set out of range flag
                    alertObj.state = OUT_OF_ALERT_RANGE;
                }
            }
        };

        if (iapi.multiValueGauge) {

            // Get access to the length of the data (number of values).
            dataCount = mathMin(values.length, ((iapi.hcInstance && iapi.hcInstance.options &&
                iapi.hcInstance.options && iapi.hcInstance.options.series &&
                iapi.hcInstance.options.series[0] && iapi.hcInstance.options.series[0].data &&
                iapi.hcInstance.options.series[0].data.length) || 0)); // phew!

            // Check for each data point if the value corresponding to it is
            // within the range of any alertObj.
            for (i = 0; i < dataCount; i += 1) {
                if (!state.lastSetValues || values[i] !== state.lastSetValues[i]) {
                    checkBounds(values[i]);
                }
            }
        }
        else {
            if (!state.lastSetValues || values[0] !== state.lastSetValues[0]) {
                checkBounds(values[0]);
            }
        }

        state.lastSetValues = values;
    };

    processRealtimeStateChange = function (event) {
        var chartObj = event.sender,
            state = chartObj.__state,
            vars,
            chart,
            logic,
            options,
            chartOptions,
            refreshMs,
            clearMs,
            dataUrl,
            dataStamp,
            realtimeEnabled,
            animation,
            ajaxObj,
            clearChart,
            requestData;

        // In case data was set during construction, both the state-change capture events can happen to be fired before
        // even them being registered. Hence, a special check is made here.
        if (state.dataSetDuringConstruction && !state.rtStateChanged && state.rtPreInit === undefined) {
            if (chartObj.dataReady()) {
                state.rtStateChanged = true;
                state.rtPreInit = true;
            }
            else {
                state.rtPreInit = false;
            }
        }

        // If the data has not changed then the realtime initialization should not be repeated.
        if (!state.rtStateChanged) {
            return;
        }
        // reset the state changed flag to indicate that drawcomplete will re-work upon next state change.
        state.rtStateChanged = false;

        // Initialize the realtime framework.
        vars = chartObj.jsVars;
        chart = vars.hcObj;

        // In case process happens before load
        if (!chart) {
            return;
        }

        logic = chart.logic;
        options = chart.options;
        chartOptions = (options && options.chart) || {};
        refreshMs = (pluckNumber(chartOptions.updateInterval, chartOptions.refreshInterval) * 1000);
        clearMs = (pluckNumber(chartOptions.clearInterval, 0) * 1000);
        dataUrl = chartOptions.dataStreamURL;
        dataStamp = chartOptions.dataStamp;
        realtimeEnabled = Boolean(logic && logic.realtimeEnabled && (refreshMs > 0) &&
            (dataUrl !== undefined) && chartOptions);

        animation = options && options.plotOptions &&
            options.plotOptions.series.animation &&
            options.plotOptions.series.animation.duration || 0;

        ajaxObj = state._rtAjaxObj;

        clearChart = function () {
            chartObj.clearChart && chartObj.clearChart();
            if (clearMs) {
                state._toClearChart = setTimeout(clearChart, clearMs);
            }
        };

        requestData = function () {
            var url = dataUrl;

            // append anti-cache querystring to url (a random number)
            url += (dataUrl.indexOf('?') === -1 ? '?num=' : '&num=') + mathRandom();
            // append data stamp to the url
            dataStamp && (url += ('&dataStamp=' + dataStamp));

            // If xhr object is open, then abort it. Probably because previous request did not return on time.
            ajaxObj.open && ajaxObj.abort();
            ajaxObj.get(url); // fetch the URL.
            state._rtAjaxLatencyStart = (new Date());
        };

        if (refreshMs <= 0) {
            state._toRealtime = clearTimeout(state._toRealtime);
            ajaxObj && ajaxObj.abort();
        }
        // validate whether refreshinterval is less than threshold.
        else if (refreshMs < THRESHOLD_MS) {
            refreshMs = THRESHOLD_MS;
        }

        state._toClearChart = clearTimeout(state._toClearChart);
        if (clearMs > 0) {
            if (clearMs < THRESHOLD_MS) {
                clearMs = THRESHOLD_MS;
            }
            else {
                state._toClearChart = setTimeout(clearChart, clearMs);
            }
        }

        state._rtStaticRefreshMS = refreshMs;

        if (realtimeEnabled) {
            if (state._rtPaused === undefined) {
                state._rtPaused = false;
            }
            state._rtDataUrl = dataUrl;
            state.lastSetValues = null;
            ajaxObj = state._rtAjaxObj || (state._rtAjaxObj = new global.ajax());

            ajaxObj.onSuccess = function (responseText, wrapper, data, url) {
                if (chartObj.disposed) {
                    return;
                }

                var logic = vars.hcObj && vars.hcObj.logic,
                    prevData,
                    updateObj = logic.linearDataParser && logic.linearDataParser(responseText, logic.multisetRealtime),
                    redrawLatency;

                // Update latency timer
                state._rtAjaxLatencyStart && (state._rtAjaxLatency = (new Date()) - state._rtAjaxLatencyStart);

                if (chartObj.isActive() && updateObj && chart && (chart.realtimeUpdate || logic.realtimeUpdate)) {

                    dataStamp = updateObj.dataStamp ?
                                updateObj.dataStamp : null;

                    // this is done for animation duration
                    updateObj.interval = refreshMs < 1000 ? refreshMs : 1000;
                    prevData = chartObj.getDataJSON();

                    if (chart.realtimeUpdate) {
                        chart.realtimeUpdate(updateObj);
                    }
                    else {
                        logic.realtimeUpdate(updateObj);
                    }
                    vars._rtLastUpdatedData = logic.multisetRealtime ? updateObj : chartObj.getDataJSON();

                    // Calculate combined latency for realtime drawing
                    redrawLatency = (logic.realtimeDrawingLatency || 0) + (state._rtAjaxLatency || 0);

                    /**
                     * This event is raised every time a real-time chart or gauge updates  itself  with new data. This
                     * event is raised in any of the following  cases:
                     *
                     * - Real-time update using `dataStreamUrl` attribute.
                     * - Real-time update of Angular gauge or Horizontal Liner gauge using user interaction (through
                     * edit mode).
                     *
                     * @group chart-realtime
                     *
                     * @event FusionCharts#realTimeUpdateComplete
                     * @param {string} data - Chart data as XML or JSON string
                     * @param {object} updateObject - It is the update object.
                     * @param {number} prevData - The previous data values.
                     * @param {number} source - Nature of data load request. Presently its value is 'XmlHttprequest'.
                     * @param {string} url - URL of the data source.
                     */
                    global.raiseEvent('realtimeUpdateComplete', {
                        data: responseText,
                        updateObject: updateObj,
                        prevData: prevData.values,
                        source: 'XmlHttpRequest',
                        url: url,
                        networkLatency: state._rtAjaxLatency,
                        latency: redrawLatency
                    }, event.sender);

                    try {
                        /* jshint camelcase: false*/
                        win.FC_ChartUpdated && win.FC_ChartUpdated(event.sender.id);
                        /* jshint camelcase: true*/
                    }
                    catch (err) {
                        setTimeout(function () {
                            throw err;
                        }, 1);
                    }

                    if (!state._rtPaused) {
                        if (redrawLatency >= state._rtStaticRefreshMS) {
                            redrawLatency = state._rtStaticRefreshMS - 1;
                        }

                        // re-issue realtime update.
                        state._toRealtime = setTimeout(requestData, state._rtStaticRefreshMS - redrawLatency);
                    }
                }
                else {
                    state._toRealtime = clearTimeout(state._toRealtime);
                }
            };

            ajaxObj.onError = function (resp, wrapper, data, url) {
                // Update latency timer
                state._rtAjaxLatencyStart && (state._rtAjaxLatency = (new Date()) - state._rtAjaxLatencyStart);

                /**
                 * This event is raised where there is an error in performing a real-time chart data update using
                 * `dataStreamUrl` attribute.
                 *
                 * @event FusionCharts#realTimeUpdateError
                 * @group chart-realtime
                 *
                 * @param {number} source - Nature of data load request. Presently its value is 'XmlHttprequest'.
                 * @param {string} url - URL of the data source.
                 * @param {object} xmlHttpReqestObject - The object which has fetched data.
                 * @param {string} httpStatus - A number which denotes the HTTP status number when the error was raised.
                 * For example, the status will be ``404`` for URL not found.
                 */
                global.raiseEvent('realtimeUpdateError', {
                    source: 'XmlHttpRequest',
                    url: url,
                    xmlHttpRequestObject: wrapper.xhr,
                    error: resp,
                    httpStatus: (wrapper.xhr && wrapper.xhr.status) ? wrapper.xhr.status : -1,
                    networkLatency: state._rtAjaxLatency
                }, event.sender);

                // Upon error, based on whether chart is alive and kicking, re-request the data or abandon realtime
                // calls.
                state._toRealtime = chartObj.isActive() ?
                    setTimeout(requestData, refreshMs) : clearTimeout(state._toRealtime);
            };

            // This is the first (initial) realtime update request to be sent. It is delayed by the max of animation
            // duration and refresh interval.
            if (!state._rtPaused) {
                state._toRealtime = resetTimeout(requestData,
                    (animation > refreshMs ? animation : refreshMs), state._toRealtime);
            }
        }

        // remove the previously added listener to the realtime update event.
        chartObj.removeEventListener('realtimeUpdateComplete', processAlerts);
        // check if the chart has any alert range(s)
        if (logic.dataObj && logic.dataObj.alerts && logic.dataObj.alerts && logic.dataObj.alerts.alert &&
            logic.dataObj.alerts.alert.length) {
            chartObj.addEventListener('realtimeUpdateComplete', processAlerts);
        }
    };

    // Clear realtime threads upon data change or re-render.
    global.addEventListener(['beforeDataUpdate', 'beforeRender'], function (event) {
        var chartObj = event.sender,
            state = chartObj.__state;

        chartObj.jsVars && (chartObj.jsVars._rtLastUpdatedData = null); // remove data cache
        // clear all timeouts
        state._toRealtime && (state._toRealtime = clearTimeout(state._toRealtime));
        state._toClearChart && (state._toClearChart = clearTimeout(state._toClearChart));
        state._rtAjaxLatencyStart = null; // clear latency claculations
        state._rtAjaxLatency = null;
    });

    // This is to prevent realtime init routines to be executed on every drawcomplete
    global.addEventListener(['renderComplete', 'dataUpdated'], function (event) {
        var state = event.sender.__state;

        (state.rtPreInit === undefined) && (state.rtPreInit = false);
        state._rtPaused && delete state._rtPaused;

        if (!state.rtStateChanged) {
            state.rtStateChanged = true;
            // If the event happens to happen while rendering is inprogress, we need to force process.
            processRealtimeStateChange.apply(this, arguments);
        }
    });

    // This is to clear any timeouts pending upon chart disposal.
    global.core.addEventListener('beforeDispose', function (event) {
        var state = event.sender.__state;
        state._toRealtime && (state._toRealtime = clearTimeout(state._toRealtime));
        state._toClearChart && (state._toClearChart = clearTimeout(state._toClearChart));
    });

    global.core.addEventListener('drawComplete', processRealtimeStateChange);
}]);
/**!
 * @license FusionCharts JavaScript Library
 * Copyright FusionCharts Technologies LLP
 * License Information at <http://www.fusioncharts.com/license>
 *
 * @version 3.4.0
 */
/**
 * @private
 *
 * @module fusioncharts.renderer.javascript.widgets
 * @export fusioncharts.widgets.js
 *
 * @requires fusioncharts.renderer.javascript.datastreamer
 */
FusionCharts.register('module', ['private', 'modules.renderer.js-widgets', function () {

    var global = this,
        lib = global.hcLib,
        R = lib.Raphael,
        //strings
        BLANK = lib.BLANKSTRING,
        BLANKSTRING = BLANK,

        createTrendLine = lib.createTrendLine,
        createContextMenu = lib.createContextMenu,

        //add the tools thats are requared
        pluck = lib.pluck,
        getValidValue = lib.getValidValue,
        pluckNumber = lib.pluckNumber,
        getFirstDefinedValue = lib.getFirstDefinedValue,
        getColorCodeString = lib.getColorCodeString,
        CONFIGKEY = lib.FC_CONFIG_STRING,
        extend2 = lib.extend2,//old: jarendererExtend / maegecolone
        getDashStyle = lib.getDashStyle, // returns dashed style of a line series
        hashify = lib.hashify,
        hasSVG = lib.hasSVG,
        falseFN = lib.falseFN,
        getFirstValue = lib.getFirstValue,
        getFirstColor = lib.getFirstColor,
        getDarkColor = lib.graphics.getDarkColor,
        getLightColor = lib.graphics.getLightColor,
        convertColor = lib.graphics.convertColor,
        parseColor = lib.graphics.parseColor,
        parseAlpha = lib.graphics.parseAlpha,
        COLOR_TRANSPARENT = lib.COLOR_TRANSPARENT,
        chartAPI = lib.chartAPI,

        parseTooltext = lib.parseTooltext,


        singleSeriesAPI = chartAPI.singleseries,

        COMMASTRING = lib.COMMASTRING,
        COMMA = COMMASTRING,
        ZEROSTRING = lib.ZEROSTRING,
        ONESTRING = lib.ONESTRING,
        ANIM_EFFECT = 'easeIn',
        CRISP = 'crisp',
        FILLMIXDARK10 = '{dark-10}',
        escapedComma = /\\,/ig,

        parseUnsafeString = lib.parseUnsafeString,
        hcStub = lib.HCstub,
        win = global.window,
        userAgent = win.navigator.userAgent,

        isIE = /msie/i.test(userAgent) && !win.opera,

        HEXCODE = lib.regex.hexcode,
        TRACKER_FILL = 'rgba(192,192,192,'+ (isIE ? 0.002 : 0.000001) +')',

        doc = win.document,
        toFloat = parseFloat,
        toInt = parseInt,
        math = Math,
        mathRound = math.round,
        mathCeil = math.ceil,
        mathMax = math.max,
        mathMin = math.min,
        mathAbs = math.abs,
        mathATan2 = math.atan2,
        mathPow = math.pow,
        mathSqrt = math.sqrt,
        mathPI = math.PI,
        deg2rad = mathPI / 180,
        dropHash = lib.regex.dropHash,
        toPrecision = lib.toPrecision,
        isArray = lib.isArray,

        HASHSTRING = lib.HASHSTRING,

        toRaphaelColor = lib.toRaphaelColor,

        TOUCH_THRESHOLD_PIXELS = lib.TOUCH_THRESHOLD_PIXELS,
        CLICK_THRESHOLD_PIXELS = lib.CLICK_THRESHOLD_PIXELS,
        hasTouch = doc.documentElement.ontouchstart !== undefined,
        // hot/tracker threshold in pixels
        HTP = hasTouch ? TOUCH_THRESHOLD_PIXELS :
                CLICK_THRESHOLD_PIXELS,

        getPosition = lib.getPosition,
        plotEventHandler = lib.plotEventHandler,
        ROLLOVER = 'DataPlotRollOver',
        ROLLOUT = 'DataPlotRollOut',
        sortColorFN,
        placeTitleOnSide,
        fixCaptionAlignment,
        GaugeAxis,
        realTimeExtension,
        renderer,
        drawThermometer,
        drawCylinder,
        drawLED,
        TEXT_ANCHOR_MAP = {
            left : 'start',
            right: 'end',
            center: 'middle'
        },

        /**
         * This enumeration decides whether to set the shape-rendering attribute of an element to 'crisp'. The issue is
         * with certain browser not rendering straight lines with shape-renderig set to crisp if effective stroke width
         * is less than 1px.
         *
         * @example element.attr('shape-rendering', DECIDE_CRISPENING[(someStrokeWidth < 1)]);
         */
        DECIDE_CRISPENING = {
            'true': undefined,
            'false': 'crisp'
        },

        getTouchEvent = function (event) { /** @todo refactor dependency */
            return (hasTouch && event.sourceEvent && event.sourceEvent.touches &&
                event.sourceEvent.touches[0]) || event;
        }, /**^ To get first touch ^*/

        // Expose utility funcitons for modules

        each = function(arr, fn, scope) { /** @todo refactor dependency */
            var i = 0,
            len = arr.length;
            //^ If a scope is specified, iterate using this scope. The check
            //^ is done outside the loop and loop is repeated for performance.
            if (scope) {
                for (; i < len; i++) {
                    if (fn.call(scope, arr[i], i, arr) === false) {
                        return i;
                    }
                }
            }
            else {
                for (; i < len; i++) {
                    if (fn.call(arr[i], arr[i], i, arr) === false) {
                        return i;
                    }
                }
            }
        },
        extend = function (a, b) { /** @todo refactor dependency */
            var n;
            if (!a) {
                a = {};
            }
            for (n in b) {
                a[n] = b[n];
            }
            return a;
        },

        UNDEFINED,
        isObject = function (obj) {
            return typeof obj === 'object';
        },
        isString = function (s) {
            return typeof s === 'string';
        },
        defined = function  (obj) {
            return obj !== UNDEFINED && obj !== null;
        },
        pInt = function(s, mag) {
            return parseInt(s, mag || 10);
        },
        HIDDEN = 'hidden',
        VISIBLE = isIE && !hasSVG ? 'visible' : '',
        M = 'M',
        A = 'A',
        L = 'L',
        Z = 'Z',

        GAUGETYPE_HORIZONTAL = 1,
        GAUGETYPE_HORIZONTAL_REVERSED = 2,
        GAUGETYPE_VERTICAL = 3,
        GAUGETYPE_VERTICAL_REVERSED = 4,
        AXISPOSITION_TOP = 1,
        AXISPOSITION_RIGHT = 2,
        AXISPOSITION_BOTTOM = 3,
        AXISPOSITION_LEFT = 4,

        MAX_MITER_LINEJOIN = 2,
        startsRGBA = lib.regex.startsRGBA,

        setLineHeight = lib.setLineHeight,
        pluckFontSize = lib.pluckFontSize, // To get the valid font size (filters negative values)
        POSITION_CENTER = lib.POSITION_MIDDLE,//lib.POSITION_CENTER,
        POSITION_TOP = lib.POSITION_TOP,
        POSITION_BOTTOM = lib.POSITION_BOTTOM,
        POSITION_RIGHT = lib.POSITION_RIGHT,
        POSITION_LEFT = lib.POSITION_LEFT,
        POSITION_MIDDLE = lib.POSITION_MIDDLE,

        HUNDREDSTRING = lib.HUNDREDSTRING,
        PXSTRING = lib.PXSTRING,
        COMMASPACE = lib.COMMASPACE,
        textHAlign = {
            right: 'end',
            left: 'start',
            middle: 'middle',
            start: 'start',
            end: 'end',
            center: 'middle',
            'undefined': '',
            '': ''
        },
        creditLabel = false && !/fusioncharts\.com$/i.test(win.location.hostname),

        roundUp = function (num, base) {
            // precise to number of decimal places
            base = (base === undefined) ? 2 : base;
            var factor = mathPow(10, base);
            num *= factor;
            num = mathRound(Number(String(num)));
            num /= factor;
            return num;
        },



        getAttrFunction = function () {

            var rotationStr = 'angle';

            return function (hash, val, animation) {
                var key,
                value,
                element = this,
                attr3D = this._Attr,
                cx = R.vml ? (-1.5) : 0, // correction of -1.5 has to be added for VML.
                cy = R.vml ? (-1.5) : 0,
                red;

                if (!attr3D) {
                    attr3D = element._Attr = {};
                }


                // single key-value pair
                if (isString(hash) && defined(val)) {
                    key = hash;
                    hash = {};
                    hash[key] = val;
                }

                // used as a getter: first argument is a string, second is undefined
                if (isString(hash)) {
                    //if belongs from the list then handle here
                    if (hash == rotationStr) {
                        element = element._Attr[hash];
                    }
                    else {//else leve for the original attr
                        element = element._attr(hash);
                    }

                // setter
                }
                else {
                    for (key in hash) {
                        value = hash[key];
                        //if belongs from the list then handle here
                        if (key === rotationStr) {
                            attr3D[key] = value;
                            red = value * deg2rad;
                            attr3D.tooltipPos[0] = attr3D.cx + (attr3D.toolTipRadius * Math.cos(red));
                            attr3D.tooltipPos[1] = attr3D.cy + (attr3D.toolTipRadius * Math.sin(red));
                            attr3D.prevValue = value;

                            if (animation && animation.duration) {
                                element.animate({
                                    transform: ('R' + value + ',' + cx + ',' + cy)
                                }, animation.duration, ANIM_EFFECT);
                            }
                            else {
                                element.attr({transform: ('R' + value + ',' + cx + ',' + cy)});
                            }
                        }
                        else {//else leave for the original attr
                            element._attr(key, value);
                        }
                    }
                }
                return element;
            };
        },



        /**
         * Handle color operations. The object methods are chainable.
         * @param {string} input The input color in either rbga or hex format
         * @private
         */
        Color = function(input) {
            // declare variables
            var rgba = [], result;

            /**
            * Parse the input color to rgba array
            * @param {string} input
            * @private
            */
            function init(input) {

                // rgba
                /* jshint maxlen:200*/
                result = /rgba\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]?(?:\.[0-9]+)?)\s*\)/.exec(input);
                /* jshint maxlen:120*/
                if (result) {
                    rgba = [parseInt(result[1], 10), parseInt(result[2], 10),
                        parseInt(result[3], 10), parseFloat(result[4])];
                }

                // hex
                else {
                    result = /#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/.exec(input);
                    if (result) {
                        rgba = [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16), 1];
                    }
                }

            }
            /**
            * Return the color a specified format
            * @param {string} format
            * @private
            */
            function get(format) {
                var ret;

                // it's NaN if gradient color on a column chart
                if (rgba && !isNaN(rgba[0])) {
                    if (format === 'rgb') {
                        ret = 'rgb('+ rgba[0] +','+ rgba[1] +','+ rgba[2] +')';
                    /**^
                     * capability to return hex code
                     */
                    } else if (format === 'hex') {
                        ret = '#' + ('000000' + (rgba[0] << 16 | rgba[1] << 8 | rgba[2]).toString(16)).slice(-6);
                    } else if (format === 'a') {
                        /*EOP^*/
                        ret = rgba[3];
                    } else {
                        ret = 'rgba('+ rgba.join(',') +')';
                    }
                }else {
                    ret = input;
                }
                return ret;
            }

            /**
             * Brighten the color
             * @param {number} alpha
             * @private
             */
            function brighten(alpha) {
                if (!isNaN(alpha) && alpha !== 0) {
                    var i;
                    for (i = 0; i < 3; i++) {
                        rgba[i] += parseInt(alpha * 255, 10);

                        if (rgba[i] < 0) {
                            rgba[i] = 0;
                        }
                        if (rgba[i] > 255) {
                            rgba[i] = 255;
                        }
                    }
                }
                return this;
            }
            /**
             * Set the color's opacity to a given alpha value
             * @param {number} alpha
             * @private
             */
            function setOpacity(alpha) {
                rgba[3] = alpha;
                return this;
            }

            // initialize: parse the input
            init(input);

            // public methods
            return {
                get: get,
                brighten: brighten,
                setOpacity: setOpacity
            };
        },

    defaultGaugePaletteOptions = extend2({}, lib.defaultGaugePaletteOptions);

    /**
     * MathExt class bunches a group of mathematical functions
     * which will be used by other classes. All the functions in
     * this class are declared as static, as the methods do not
     * relate to any specific instance.
     * @class MathExt
     * @author FusionCharts Technologies
     * @version 3.0
     *
     * Copyright (C) FusionCharts Technologies
     * @private
     */
    function MathExt () {
    //Nothing to do.
    }

    MathExt.prototype = /** @lends MathExt# */{

        /**
         * numDecimals method returns the number of decimal places provided
         * in the given number.
         *  @param  num Number for which we've to find the decimal places.
         *  @return Number of decimal places found.
         */
        numDecimals: function (num) {
            // Fix for upperLimits or lowerLimits given in decimal
            num = toPrecision(num, 10);
            //Absolute value (to avoid floor disparity for negative num)
            num = Math.abs(num);
            //Get decimals
            var decimal = toPrecision((num-Math.floor(num)), 10),
            //Number of decimals
            numDecimals = (String(decimal).length-2);
            //For integral values
            numDecimals = (numDecimals<0) ? 0 : numDecimals;
            //Return the length of string minus '0.'
            return numDecimals;
        },
        /**
         * toRadians method converts angle from degrees to radians
         * @param   angle   The numeric value of the angle in
         *                  degrees
         * @return          The numeric value of the angle in radians
         */
        toRadians: function (angle) {
            return (angle/180)*Math.PI;
        },
        /**
         * toDegrees method converts angle from radians to degrees
         * @param   angle   The numeric value of the angle in
         *                  radians
         * @returns         The numeric value of the angle in degrees
         */
        toDegrees: function (angle) {
            return (angle/Math.PI)*180;
        },
        /**
         * flashToStandardAngle method converts angles from Flash angle to normal angles (0-360).
         *  @param  ang     Angle to be converted
         *  @return         Converted angle
         */
        flashToStandardAngle: function (ang) {
            return -1*ang;
        },
        /**
         * standardToFlashAngle method converts angles from normal angle to Flash angles
         *  @param  ang     Angle to be converted
         *  @return         Converted angle
         */
        standardToFlashAngle: function (ang) {
            return -1*ang;
        },
        /**
         * flash180ToStandardAngle method changes a Flash angle (-180° to 180°) into standard
         * angle (0° to 360° CCW) wrt the positive x-axis using angle input.
         * @param   ang   Angle in degrees (-180° to 180°).
         * @return          Angle in degrees (0° to 360° CCW).
         **/
        flash180ToStandardAngle: function (ang) {
            var a = 360-(((ang%=360)<0) ? ang+360 : ang);
            return (a==360) ? 0 : a;
        },
        /**
         * getAngularPoint method calculates a point at a given angle
         * and radius from the given point.
         *  @param  fromX       From point's X co-ordinate
         *  @param  fromY       From point's Y co-ordinate
         *  @param  distance    How much distance (pixels) from current point?
         *  @param  angle       At what angle (degrees - standard) from current point
         */
        getAngularPoint: function(fromX, fromY, distance, angle) {
            //Convert the angle into radians
            angle = angle*(Math.PI/180);
            var xPos = fromX+(distance*Math.cos(angle)),
                yPos = fromY-(distance*Math.sin(angle));
            return ({
                x:xPos,
                y:yPos
            });
        },
        /**
         * remainderOf method calculates the remainder in
         * a division to the nearest twip.
         * @param   a   dividend in a division
         * @param   b   divisor in a division
         * @returns     Remainder in the division rounded
         *              to the nearest twip.
         */
        remainderOf: function (a, b) {
            return roundUp(a%b);
        },
        /**
         * boundAngle method converts any angle in degrees
         * to its equivalent in the range of 0 to 360 degrees.
         * @param   angle   Angle in degrees to be procesed;
         *                  can take negetive values.
         * @returns         Equivalent non-negetive angle in degrees
         *                  less than or equal to 360 degrees
         */
        boundAngle: function (angle) {
            if (angle>=0) {
                return MathExt.prototype.remainderOf(angle, 360);
            }
            else {
                return 360-MathExt.prototype.remainderOf(Math.abs(angle), 360);
            }
        },
        /**
         * toNearestTwip method converts a numeric value by
         * rounding it to the nearest twip value ( one twentieth
         * of a pixel ) for propermost rendering in flash.
         * @param   num     Number to rounded
         * @returns         Number rounded upto 2 decimal places and
         *                  second significant digit right of decimal
         *                  point, if exists at all is 5.
         */
        toNearestTwip: function(num) {
            var n = num,
                s = (n<0) ? -1 : 1,
                k = Math.abs(n),
                r = mathRound(k*100),
                b = Math.floor(r/5),
                t = Number(String(r-b*5)),
                m = (t>2) ? b*5+5 : b*5;
            return s*(m/100);
        },
        /**
         * roundUp method is used to format trailing decimal
         * places to the required precision, with default base 2.
         * @param       num     number to be formatted
         * @param       base    number of precision digits
         * @returns     formatted number
         * @private
         */
        roundUp: function (num, base) {
            // precise to number of decimal places
            base = (base === undefined) ? 2 : base;
            var factor = mathPow(10, base);
            num *= factor;
            num = mathRound(Number(String(num)));
            num /= factor;
            return num;
        }
    };

    MathExt.prototype.constructor = MathExt;
    lib.MathExt = MathExt;



    placeTitleOnSide = function (hcJSON, fcJSON, allowedWidth, height, defaultPadding, chartWidth, chartHeight, iapi) {
        // Caption Space Management
        var conf = hcJSON[CONFIGKEY],
            smartLabel = conf.smartLabel,
            FCChartObj = fcJSON.chart,
            chart = hcJSON.chart,
            capStyle, subCapStyle, captionObj, subCaptionObj, maxCaptionWidth = 0,
            titleObj = hcJSON.title, subTitleObj = hcJSON.subtitle,
            titleText = titleObj.text,
            subTitleText = subTitleObj.text,
            captionPadding = pluckNumber(FCChartObj.captionpadding, defaultPadding, 2),
            captionLineHeight = 0, subCaptionLineHeight = 0,
            subCaptionFontSize = 0, captionFontSize = 0,
            captionOnRight = pluckNumber(FCChartObj.captiononright, 0),
            captionPosition = getValidValue(FCChartObj.captionposition, 'top').toLowerCase(),
            HEIGHT_PADDING = 0,
            GUTTER_PADDING = 2,
            captionHeight = 0,
            captionMaxHeight = height,
            actualCaptionWidth, captionWidth = {
                left: 0,
                right: 0
            },
            snapLiterals = iapi.snapLiterals || (iapi.snapLiterals = {}),
            captionSubCaptionGap,
            captionGap = 0,
            subCaptionGap = 0;


        // Finding the Caption and SubCaption Width.
        if (titleText !== BLANKSTRING) {//calculatethe single line's height
            capStyle = titleObj.style;
            captionLineHeight = pluckNumber(parseInt(capStyle.fontHeight, 10), parseInt(capStyle.lineHeight, 10), 12);
            captionFontSize = pluckNumber(parseInt(capStyle.fontSize, 10), 10);
        }
        if (subTitleText !== BLANKSTRING) {
            subCapStyle = subTitleObj.style;
            subCaptionLineHeight = pluckNumber(parseInt(subCapStyle.fontHeight, 10),
                                    parseInt(subCapStyle.lineHeight, 10), 12);
            subCaptionFontSize = pluckNumber(parseInt(subCapStyle.fontSize, 10), 10);
        }
        if (captionLineHeight > 0 || subCaptionLineHeight > 0) {
            smartLabel.setStyle(capStyle);
            captionObj = smartLabel.getSmartText(titleObj.text, allowedWidth, captionMaxHeight);
            // Force fully increase width to give a gutter in caption and subCaption
            if (captionObj.width > 0) {
                captionObj.width += GUTTER_PADDING;
                captionHeight = captionObj.height;
            }

            smartLabel.setStyle(subCapStyle);
            subCaptionObj = smartLabel.getSmartText(subTitleObj.text, allowedWidth, height - captionHeight);
            // Force fully increase width to give a gutter in caption and subCaption
            if (subCaptionObj.width > 0) {
                subCaptionObj.width += GUTTER_PADDING;
            }
            captionSubCaptionGap =  captionObj.height + HEIGHT_PADDING + (subCaptionFontSize / 2);
            switch (captionPosition) {
                case 'middle':
                    titleObj.y = (height / 2) - captionObj.height;
                    subTitleObj.y = titleObj.y  + captionSubCaptionGap;
                    break;
                case 'bottom':
                    subTitleObj.y = height - chart.marginBottom - chart.marginTop - subCaptionObj.height;
                    titleObj.y = subTitleObj.y - (captionObj.height > 0 ? captionSubCaptionGap : 0);
                    break;
                default: // We put it on top by default
                    titleObj.y = 0;//(captionFontSize / 2) - HEIGHT_PADDING;
                    subTitleObj.y = captionSubCaptionGap;
                    break;
            }

            maxCaptionWidth = Math.max(captionObj.width, subCaptionObj.width);
            // Replace the caption and subCaption text with the new wrapped text
            hcJSON.title.text = captionObj.text;
            captionObj.tooltext && (hcJSON.title.originalText = captionObj.tooltext);

            hcJSON.subtitle.text = subCaptionObj.text;
            subCaptionObj.tooltext && (hcJSON.subtitle.originalText = subCaptionObj.tooltext);

            //Add caption padding, if either caption or sub-caption is to be shown
            if (maxCaptionWidth > 0) {
                maxCaptionWidth = maxCaptionWidth + captionPadding;
            }

            actualCaptionWidth = Math.min(maxCaptionWidth, allowedWidth);

            if (captionOnRight) {
                titleObj.align = subTitleObj.align = textHAlign.start;
                captionWidth.right = actualCaptionWidth;
                titleObj.x = chartWidth - maxCaptionWidth + captionPadding;
                subTitleObj.x = chartWidth - maxCaptionWidth + captionPadding;
            } else {
                titleObj.align = subTitleObj.align = textHAlign.end;
                captionWidth.left = actualCaptionWidth;
                titleObj.x = maxCaptionWidth - captionPadding;
                subTitleObj.x = maxCaptionWidth - captionPadding;
                captionGap = actualCaptionWidth;
                subCaptionGap = subCaptionObj.width;
            }
            // populate caption/subcaption width's for calculating snapliterals later

            titleObj._captionWidth = captionObj.width;
            subTitleObj._subCaptionWidth = subCaptionObj.width;

            // populate caption/sub-caption related annotation snap literals
            snapLiterals.captionstartx = titleObj.x - captionGap;
            snapLiterals.captionstarty = titleObj.y;
            snapLiterals.captionwidth = captionObj.width;
            snapLiterals.captionheight = captionHeight || 0;
            snapLiterals.captionendx = snapLiterals.captionstartx + snapLiterals.captionwidth;
            snapLiterals.captionendy = snapLiterals.captionstarty + snapLiterals.captionheight;
            snapLiterals.subcaptionstartx = subTitleObj.x - subCaptionGap;
            snapLiterals.subcaptionstarty = subTitleObj.y;
            snapLiterals.subcaptionwidth = subCaptionObj.width > 0 ? subCaptionObj.width : 0;
            snapLiterals.subcaptionheight = subCaptionObj.height > 0 ? subCaptionObj.height : 0;
            snapLiterals.subcaptionendx = snapLiterals.subcaptionstartx + snapLiterals.subcaptionwidth;
            snapLiterals.subcaptionendy = snapLiterals.subcaptionstarty + snapLiterals.subcaptionheight;
        }

        return captionWidth;
    },


    fixCaptionAlignment = function (hcJSON, fcJSON, width, leftLabel, rightLabel, iapi) {

        var HCChartObj = hcJSON.chart,
            FCChartObj = fcJSON.chart,
            titleObj = hcJSON.title,
            captionPadding = pluckNumber(FCChartObj.captionpadding, 2),
            captionOnRight = pluckNumber(FCChartObj.captiononright, 0),
            subTitleObj = hcJSON.subtitle,
            canvasWidth,
            GUTTER_PADDING = 2,
            snapLiterals = iapi.snapLiterals,
            captionGap = 0,
            subCaptionGap = 0;

        HCChartObj.spacingRight = HCChartObj.spacingLeft = 0;

        if (!defined(leftLabel)) {
            leftLabel = 0;
        }
        if (!defined(rightLabel)) {
            rightLabel = 0;
        }

        if (captionOnRight) {
            canvasWidth = (width - HCChartObj.marginRight);
            subTitleObj.align = titleObj.align = textHAlign.start;
            //labelsMaxWidth = HCChartObj.marginRight - captionWidth.right;
            titleObj.x = subTitleObj.x = canvasWidth + captionPadding + rightLabel + GUTTER_PADDING;
        } else {
            canvasWidth = (width - HCChartObj.marginLeft);
            subTitleObj.align = titleObj.align = textHAlign.end;
            titleObj.x = subTitleObj.x = HCChartObj.marginLeft - HCChartObj.spacingLeft -
                            captionPadding - leftLabel - GUTTER_PADDING;
            captionGap = titleObj._captionWidth;
            subCaptionGap = subTitleObj._subCaptionWidth;
        }
        snapLiterals.captionstartx = titleObj.x - captionGap;
        snapLiterals.subcaptionstartx = subTitleObj.x - subCaptionGap;
        snapLiterals.captionendx = snapLiterals.captionstartx +  snapLiterals.captionwidth;
        snapLiterals.subcaptionendx = snapLiterals.subcaptionstartx +  snapLiterals.subcaptionwidth;
    };


    /**
     * @class GaugeAxis
     * @author InfoSoft Global (P) Ltd. www.InfoSoftGlobal.com
     * @version 3.0
     *
     * Copyright (C) InfoSoft Global Pvt. Ltd.
     *
     * GaugeAxis class represents the generic gauge axis for any single
     * gauge. The APIs and methods have been created
     * to support real-time update of gauge, when data feeds come in.
     * var GaugeAxis = function (minValue, maxValue, stopMaxAtZero,
     *  setMinAsZero, numMajorTM, numMinorTM, adjustTM, tickValueStep, showLimits,
     *   nfFormatting, bFormatNumber, bFormatNumberScale, decimals, forceDecimals) {
     * @private
     */
    GaugeAxis = function (minValue, maxValue, stopMaxAtZero, scale, nfFormatting) {
        //Store as instance variables
        this.userMin = minValue;
        this.userMax = maxValue;
        //Default tick marks
        this.numMajorTM = pluckNumber(scale.majorTMNumber, -1);
        this.numMinorTM = pluckNumber(scale.minorTMNumber, 5);
        this.adjustTM = scale.adjustTM;
        this.tickValueStep = pluckNumber(scale.tickValueStep, 1);
        this.showLimits = pluckNumber(scale.showLimits, 1);
        this.showTickValues = pluckNumber(scale.showTickValues, 1);
        //Number formatting reference
        this.nf = nfFormatting;
        //Number formatting related properties
        //stopMaxAtZero and setMinAsZero
        this.stopMaxAtZero = stopMaxAtZero;
        this.setMinAsZero = !scale.setAdaptiveMin;
        // upperLimitDisplay text
        this.upperLimitDisplay = scale.upperLimitDisplay;
        // lowerLimitDisplay text
        this.lowerLimitDisplay = scale.lowerLimitDisplay;
        //Store flags whether max and min have been explicity specified by the user.
        this.userMaxGiven = (this.userMax === null || this.userMax === undefined || this.userMax === '') ? false:true;
        this.userMinGiven = (this.userMin === null || this.userMin === undefined || this.userMin === '') ? false:true;
        //Initialize tick marks container
        this.majorTM = [];
        this.minorTM = [];
        this.MathExt = new MathExt();
    };
    /**
     * setAxisCoords method sets the starting and ending axis position
     * The position can be pixels or angles. Here if the axis is reverse,
     * we can pass reverse startAxisPos and endAxisPos, depending on which
     * side we consider as start. getPosition() method will then automatically
     * return the right values based on the same.
     *  @param  startAxisPos    Start position (or angle) for that axis
     *  @param  endAxisPos      End position (or angle) for that axis
     *  @return                 Nothing
     */
    GaugeAxis.prototype = {
        setAxisCoords: function (startAxisPos, endAxisPos){
            //Just store it
            this.startAxisPos = startAxisPos;
            this.endAxisPos = endAxisPos;
        },
        /**
         * calculateLimits method helps calculate the axis limits based
         * on the given maximum and minimum value.
         *  @param  maxValue        Maximum numerical value present in data
         *  @param  minValue        Minimum numerical value present in data
         */
        calculateLimits: function (maxValue, minValue) {
            var isMinValid = true,
                isMaxValid = true,
                userMax = Number(this.userMax),
                maxPowerOfTen,
                minPowerOfTen,
                powerOfTen,
                yInterval,
                rangePowerOfTen,
                rangeInterval,
                yTopBound,
                yLowerBound,
                _min;
            //First check if both maxValue and minValue are proper numbers.
            //Else, set defaults as 0.9,0
            //For Max Value
            if(isNaN(maxValue)){
                maxValue = 0.9;
                isMaxValid = false;
            }
            //For Min Value
            if(isNaN(minValue)){
                minValue = 0;
                isMinValid = false;
            }
            //Or, if only 0 data is supplied
            if ((maxValue === minValue) && (maxValue === 0) && (isNaN(userMax) || userMax === 0)) {
                maxValue = 0.9;
            }
            //Get the maximum power of 10 that is applicable to maxvalue
            //The Number = 10 to the power maxPowerOfTen + x (where x is another number)
            //For e.g., in 99 the maxPowerOfTen will be 1 = 10^1 + 89
            //And for 102, it will be 2 = 10^2 + 2
            maxPowerOfTen = Math.floor (Math.log (Math.abs (maxValue)) / Math.LN10);
            //Get the minimum power of 10 that is applicable to maxvalue
            minPowerOfTen = Math.floor (Math.log (Math.abs (minValue)) / Math.LN10);
            //Find which powerOfTen (the max power or the min power) is bigger
            //It is this which will be multiplied to get the y-interval
            powerOfTen = Math.max (minPowerOfTen, maxPowerOfTen);
            yInterval = mathPow (10, powerOfTen);
            //For accomodating smaller range values (so that scale doesn't represent too large an interval
            if (Math.abs (maxValue) / yInterval < 2 && Math.abs (minValue) / yInterval < 2) {
                powerOfTen --;
                yInterval = mathPow (10, powerOfTen);
            }
            //If the yInterval of min and max is way more than that of range.
            //We need to reset the y-interval as per range
            rangePowerOfTen = Math.floor (Math.log (maxValue - minValue) / Math.LN10);
            rangeInterval = mathPow (10, rangePowerOfTen);
            //Now, if rangeInterval is 10 times less than yInterval, we need to re-set
            //the limits, as the range is too less to adjust the axis for max,min.
            //We do this only if range is greater than 0 (in case of 1 data on chart).
            if (((maxValue - minValue) > 0) && ((yInterval / rangeInterval) >= 10)){
                yInterval = rangeInterval;
                powerOfTen = rangePowerOfTen;
            }
            //Calculate the y-axis upper limit
            yTopBound = (Math.floor (maxValue / yInterval) + 1) * yInterval;
            //Calculate the y-axis lower limit
            //yLowerBound;
            //If the min value is less than 0
            if (minValue<0){
                //Then calculate by multiplying negative numbers with y-axis interval
                yLowerBound = - 1 * ((Math.floor (Math.abs (minValue / yInterval)) + 1) * yInterval);
            } else {
                //Else, simply set it to 0.
                if (this.setMinAsZero){
                    yLowerBound = 0;
                } else {
                    yLowerBound = Math.floor (Math.abs (minValue / yInterval) - 1) * yInterval;
                    //Now, if minValue>=0, we keep x_lowerBound to 0 - as for values like minValue 2
                    //lower bound goes negative, which is not required.
                    yLowerBound = (yLowerBound < 0) ?0 : yLowerBound;
                }
            }
            //MaxValue cannot be less than 0 if stopMaxAtZero is set to true
            if (this.stopMaxAtZero && maxValue <= 0){
                yTopBound = 0;
            }
            //If he has provided it and it is valid, we leave it as the upper limit
            //Else, we enforced the value calculate by us as the upper limit.
            if (this.userMaxGiven === false || (this.userMaxGiven === true && userMax < maxValue  && isMaxValid)) {
                this.max = yTopBound;
            } else {
                this.max = userMax;
            }
            //Now, we do the same for y-axis lower limit
            if (this.userMinGiven === false || (this.userMinGiven === true &&
                Number (this.userMin) > minValue && isMinValid)) {
                this.min = yLowerBound;
            } else {
                this.min = Number (this.userMin);
            }
            //If min is greater than or equal to max then reset those
            if(this.min > this.max){
                if( (this.min ==  Number(this.userMin)) && (this.max ==  userMax)) {
                    _min = this.min;
                    this.min = this.max;
                    this.max = _min;
                }else if( this.min ==  Number(this.userMin) ){
                    this.max = this.min + 1;
                }else if( this.max ==  userMax) {
                    this.min = this.max - 1;
                }
            }else if(this.min == this.max){
                this.max = this.min + 1;
            }
            //Store axis range
            this.range = Math.abs (this.max - this.min);
            //Store interval
            this.interval = yInterval;
            //Based on this scale, calculate the tick interval
            this.calcTickInterval();
        },
        /**
         * calcTickInterval method calculates the best division interval for the given/calculated
         * min, max specified and numMajorTM specified. Following two cases have been dealt with:
         * Case 1: If both min and max was calculated by us, we re-set them so that we get a best
         * interval based on numMajorTM. The idea is to have equal intervals without changing numMajorTM.
         * Case 2: We change numMajorTM based on the axis limits. Also, we change only if user has
         * opted to adjustTM.
         */
        calcTickInterval: function () {

            var adjRange,
                deltaRange,
                counter,
                multiplyFactor,
                calcMajorTM;

            //We cannot have a numMajorTM less than 2, if explicitly specified
            if (this.numMajorTM!=-1 && this.numMajorTM<2){
                this.numMajorTM = 2;
            }
            //Case 1: User has not specified either max or min, but specified numMajorTM
            if (this.userMinGiven === false && this.userMaxGiven === false && this.numMajorTM!==-1){
                /**
                 * In this case, we first get apt divisible range based on min, max,
                 * numMajorTM and the calculated interval. Thereby, get the difference
                 * between original range and new range and store as delta.
                 * If max>0, add this delta to max. Else substract from min.
                 * In this case, we keep numMajorTM constant and vary the axis's limits.
                 */
                //If user has not specified any number of major tick marks, we default to 5.
                this.numMajorTM = (this.numMajorTM==-1)?5:this.numMajorTM;
                //Get the adjusted divisible range
                adjRange = this.getDivisibleRange (this.min, this.max, this.numMajorTM, this.interval, true);
                //Get delta (Calculated range minus original range)
                deltaRange = adjRange - this.range;
                //Update global range storage
                this.range = adjRange;
                //Now, add the change in range to max, if max > 0, else deduct from min
                if (this.max > 0){
                    this.max = this.max + deltaRange;
                }
                else {
                    this.min = this.min - deltaRange;
                }
            } else {
                /**
                 * Here, we adjust the number of tick marks based on max, min, if
                 * user has opted to adjustTM.
                 */
                //If the user has not specified any tick mark number, we assume a default of 5.
                this.numMajorTM = (this.numMajorTM==-1)?5:this.numMajorTM;
                //Since we're considering the upper and lower limits of axis as major tick marks,
                //so calculation is necessary only if there are more than 2 tick marks. Else, they
                //simple represent the upper and lower limit.
                //Also, we adjust number of tick marks only if user has opted for adjustTM
                if (this.adjustTM === true){
                    counter = 0;
                    multiplyFactor = 1;
                    //calcMajorTM;
                    while (1 == 1){
                        //Increment,Decrement numMajorTM
                        calcMajorTM = this.numMajorTM + (counter * multiplyFactor);
                        //Cannot be 0
                        calcMajorTM = (calcMajorTM === 0) ? 1 : calcMajorTM;
                        //Check whether this number of calcMajorTM satisfies our requirement
                        if (this.isRangeDivisible (this.range, calcMajorTM, this.interval)){
                            //Exit loop
                            break;
                        }
                        //Each counter comes twice: one for + count, one for - count
                        counter = (multiplyFactor == - 1 || (counter > this.numMajorTM)) ? ( ++ counter) : (counter);
                        if (counter > 25) {
                            //We do not go beyond 25 count to optimize.
                            //If the loop comes here, it means that divlines
                            //counter is not able to achieve the target.
                            //So, we assume no tick marks are possible and exit.
                            //Just store the tick mark for the upper and lower limits.
                            // OLD Code.
                            //calcMajorTM = 2;
                            calcMajorTM = this.numMajorTM;
                            break;
                        }
                        //Switch to increment/decrement mode. If counter
                        multiplyFactor = (counter <= this.numMajorTM) ? (multiplyFactor * - 1) : (1);
                    }
                    //Store the value in params
                    this.numMajorTM = (calcMajorTM > 1) ? calcMajorTM : this.numMajorTM;
                } /*
                else {
                //Do nothing. This case comes where user has opted not to adjust TM.
                } */
            }
            //Store the major tick interval
            this.majorTickInt = (this.max - this.min)/(this.numMajorTM-1);
        },
        /**
         * isRangeDivisible method helps us judge whether the given range is
         * perfectly divisible for specified interval & numMajorTM.
         * To check that, we divide the given range into numMajorTM section.
         * If the decimal places of this division value is <= that of interval,
         * that means, this range fits in our purpose. We return a boolean value
         * accordingly.
         *  @param  range       Range of axis (Max - Min). Absolute value
         *  @param  numMajorTM  Number of tick marks to be plotted.
         *  @param  interval    Axis Interval (power of ten).
         *  @return             Boolean value indicating whether this range is divisible
         *                      by the given number of tick marks.
         */
        isRangeDivisible: function (range, numMajorTM, interval) {
            //Get range division
            var rangeDiv = range/(numMajorTM-1);
            //Now, if the decimal places of rangeDiv and interval do not match,
            //it's not divisible, else it's divisible
            if (this.MathExt.numDecimals(rangeDiv) > this.MathExt.numDecimals(interval)){
                return false;
            } else {
                return true;
            }
        },
        /**
         * getDivisibleRange method calculates a perfectly divisible range based
         * on interval, numMajorTM, min and max specified.
         * We first get the range division for the existing range
         * and user specified number of tick marks. Now, if that division satisfies
         * our needs (decimal places of division and interval is equal), we do NOT
         * change anything. Else, we round up the division to the next higher value {big delta
         * in case of smaller values i.e., interval <1 and small delta in case of bigger values >1).
         * We multiply this range division by number of tick marks required and calculate
         * the new range.
         *  @param  min             Min value of axis
         *  @param  max             Max value of axis
         *  @param  numMajorTM      Number of major tick marks to be plotted.
         *  @param  interval        Axis Interval (power of ten).
         *  @param  interceptRange  Boolean value indicating whether we've to change the range
         *                          by altering interval (based on it's own value).
         *  @return                 A range that is perfectly divisible into given number of sections.
         */
        getDivisibleRange: function (min, max, numMajorTM, interval, interceptRange){
            var range,
                rangeDiv,
                checkLimit;
            //If numMajorTM<3, we do not need to calculate anything, so simply return the existing range
            if (numMajorTM<3){
                return this.range;
            }
            //Get the range division for current min, max and numMajorTM
            range = Math.abs (max - min);
            rangeDiv = range/(numMajorTM-1);
            //Now, the range is not divisible
            if (!this.isRangeDivisible(range, numMajorTM, interval)){
                //We need to get new rangeDiv which can be equally distributed.
                //If intercept range is set to true
                if (interceptRange){
                    //Re-adjust interval so that gap is not much (conditional)
                    //Condition check limit based on value
                    checkLimit = (interval>1)?2:0.5;
                    if ((Number(rangeDiv)/Number(interval))<checkLimit){
                        //Decrease power of ten to get closer rounding
                        interval = interval/10;
                    }
                }
                //Adjust range division based on new interval
                rangeDiv = (Math.floor(rangeDiv/interval)+1)*interval;
                //Get new range
                range = rangeDiv*(numMajorTM-1);
            }
            //Return range
            return range;
        },
        /**
         * calculateTicks method calculates the tick values for the axis and stores
         * them in instance variables.
         *  @return         Nothing
         */
        calculateTicks: function () {
            //Initialize the containers - as for each call, we'll change old values
            this.majorTM = [];
            this.minorTM = [];
            //First, create each major tick mark and store it in this.majorTM
            var count = 0, tickValue, displayValue, i, j,
            minorTickInterval,
            numMajorTM = this.numMajorTM,
            numMinorTM = this.numMinorTM,
            NumberFormatter = this.nf,
            tickValueStep = this.tickValueStep,
            lowerLimitDisplay = parseUnsafeString(this.lowerLimitDisplay),
            upperLimitDisplay = parseUnsafeString(this.upperLimitDisplay),
            majorTickInt = this.majorTickInt,
            min = this.min,
            showTickValues = this.showTickValues,
            string = false,
            showLimits = pluckNumber(this.showLimits, showTickValues);
            for (; count < numMajorTM; count += 1) {
                //Converting to string and back to number to avoid Flash's rounding problems.
                //tickValue = Number(min + (majorTickInt * count));
                // Fix for showing more decimal places in tick marks labels
                tickValue = toPrecision(Number(min + (majorTickInt * count)), 10);
                //Whether to show this tick
                displayValue = NumberFormatter.scale(tickValue);
                string = false;
                if (count % tickValueStep !== 0 && count !== numMajorTM - 1) {
                    displayValue = BLANKSTRING;
                }
                else {
                    if (count === 0 || count === numMajorTM - 1) {
                        if (!showLimits) {
                            displayValue = BLANKSTRING;
                        }
                        else if (count === 0 && lowerLimitDisplay){
                            displayValue = lowerLimitDisplay;
                            string = true;
                        }
                        else if (count == numMajorTM - 1 && upperLimitDisplay){
                            displayValue = upperLimitDisplay;
                            string = true;
                        }
                    }
                    else if (!showTickValues) {
                        displayValue = BLANKSTRING;
                    }
                }

                //Push it into array
                this.majorTM.push({
                    displayValue: displayValue,
                    isString: string,
                    value: tickValue
                });
            }
            //Now, we'll store the values of each minor tick mark
            minorTickInterval = majorTickInt / (numMinorTM + 1);
            for (i = 0; i < numMajorTM - 1; i += 1) {
                for (j = 1; j <= numMinorTM; j += 1) {
                    this.minorTM.push(this.majorTM[i].value + minorTickInterval * j);
                }
            }
        },
        /**
         * returnDataAsTick method returns the data provided to the method
         * as a tick value object.
         *  @param  value       Value of tick line
         *  @param  showValue   Whether to show value of this div line
         *  @return             An object with the parameters of div line
         */
        returnDataAsTick: function (value, showValue) {
            //Create a new object
            var tickObject = {};
            //Set numerical value
            tickObject.value = value;
            //Set display value - formatted number.
            tickObject.displayValue = this.nf.dataLabels(value);
            //Whether we've to show value for this tick mark?
            tickObject.showValue = showValue;
            //Return the object
            return tickObject;
        },
        // ---------------- Public APIs for accessing data ------------------//
        /**
         * getMax method exposes the calculated max of this axis.
         *  @return     Calculated max for this axis.
         */
        getMax: function (){
            return this.max;
        },
        /**
         * getMin method exposes the calculated min of this axis.
         *  @return     Calculated min for this axis.
         */
        getMin: function (){
            return this.min;
        },
        /**
         * getMajorTM method returns the major tick values for the axis
         *  @return     Array of major tick values lines.
         */
        getMajorTM: function (){
            return this.majorTM;
        },
        /**
         * getMinorTM method returns the minor tick values for the axis
         *  @return     Array of minor tick values lines.
         */
        getMinorTM: function (){
            return this.minorTM;
        },
        /**
         * getAxisPosition method gets the pixel/angle position of a particular
         * point on the axis based on its value.
         *  @param  value       Numerical value for which we need pixel/angle axis position
         *  @return             The pixel position of the value on the given axis.
         */
        getAxisPosition: function (value) {


            //We can calculate only if axis co-ords have been defined
            if (this.startAxisPos===undefined || this.endAxisPos===undefined){
                throw new Error('Cannot calculate position, as axis co-ordinates have not been defined.'+
                    ' Please use setAxisCoords() method to define the same.');
            }
            //Define variables to be used locally
            var numericalInterval,
                axisLength,
                relativePosition,
                absolutePosition;
            //Get the numerical difference between the limits
            numericalInterval = (this.max - this.min);
            axisLength = (this.endAxisPos - this.startAxisPos);
            relativePosition = (axisLength / numericalInterval) * (value - this.min);
            //Calculate the axis position
            absolutePosition = this.startAxisPos + relativePosition;
            return absolutePosition;
        },
        /**
         * getValueFromPosition method gets the numerical value of a particular
         * point on the axis based on its axis position.
         *  @param  position    Position on the axis.
         *  @return             Numerical value for this position.
         */
        getValueFromPosition: function (position) {
            //We can calculate only if axis co-ords have been defined
            if (this.startAxisPos === undefined || this.endAxisPos === undefined){
                throw new Error('Cannot calculate value, as axis co-ordinates have not been defined.'+
                    ' Please use setAxisCoords() method to define the same.');
            }
            //Define variables to be used locally
            var numericalInterval,
                //Deltas of axis w.r.t min and max
                dd1,
                dd2,
                value;
            //Get the numerical difference between the limits
            numericalInterval = (this.max - this.min);
            //Get deltas of the position w.r.t both ends of axis.
            dd1 = position - this.startAxisPos;
            dd2 = this.endAxisPos - position;
            //Based on distribution of position on the axis scale, get value
            value = (dd1/(dd1+dd2))*numericalInterval + this.min;
            //Return it
            return value;
        }
    };


    /**
     * calculateScaleFactor method calculates the scaling required for the chart
     * required for dynamic scaling from original width and height
     */
    function getScaleFactor(origW, origH, canvasWidth, canvasHeight) {
        var scaleFactor;
        origH = pluckNumber(origH, canvasHeight);
        origW = pluckNumber(origW, canvasWidth);
        if (!origH || !origW) {
            scaleFactor = 1;
        }
        // Now, if the ratio of original width,height & stage width,height are same
        else if ((origW / canvasWidth) == (origH / canvasHeight)) {
            //In this case, the transformation value would be the same, as the ratio
            //of transformation of width and height is same.
            scaleFactor = canvasWidth / origW;
        } else {
            //If the transformation factors are different, we do a constrained scaling
            //We get the aspect whose delta is on the lower side.
            scaleFactor = Math.min((canvasWidth / origW), (canvasHeight / origH));
        }


        return scaleFactor;
    }



    ///********        ChartAPI        ********///
    chartAPI('gaugebase', {
        creditLabel: creditLabel,
        defaultPaletteOptions: defaultGaugePaletteOptions,
        multiValueGauge: false,
        // Map different NumberFormattion attributes default value
        decimals: 2,
        formatnumberscale: 0,
        drawAnnotations: true,
        useScaleRecursively: true,
        includeColorRangeInLimits: false,

        init: function (container, dataObj, chartObj) {

            var api = this, vars = chartObj.jsVars;

            // Store realtime data within chartAPI
            if (vars && vars._rtLastUpdatedData) {
                api.rtLatestSeriesData = vars._rtLastUpdatedData;
            } else {
                api.rtLatestSeriesData = null;
            }

            // call the original init function of base
            return chartAPI.base.init.apply(api, arguments);
        },

        chart: function (width, height) {
            var iapi = this,
                chartName = iapi.name,
                obj = iapi.dataObj || {},
                FCChartObj = obj.chart || {},
                defaultSeries = iapi.defaultSeriesType,
                colorM = iapi.colorManager,
                palleteString,
                colorArr,
                fontBdrColor,
                dataLabelsStyle,
                hc,
                is3d,
                plotOptions,
                showBorder,
                showGaugeBorder,
                HCChartObj,
                conf,
                paletteIndex,
                inCanfontFamily,
                inCanfontSize,
                inCancolor,
                outCanfontFamily,
                outCanfontSize,
                outCancolor,
                fontSize,
                outCanLineHeight,
                inCanLineHeight,
                origW,
                origH,
                scaleOnResize,
                autoScale,
                scaleFactor,
                bgImageDisplayMode,
                bgImageVAlign,
                bgImageHAlign,
                TILE,
                FILL,
                FIT,
                tooltipStyle,
                plotSpacePercent,
                bSymbolPadding,
                bPosition,
                bHAlign,
                bVAlign,
                vDirection,
                hDirection,
                toolbar,
                button;

            //set the default tooltip charecter seperator if not defined
            // We don't need to set "tooltipsepchar" here
            //obj.chart.tooltipsepchar = pluck(FCChartObj.tooltipsepchar, COMMASTRING);

            //creade defaule stub
            hc = hcStub(obj, width, height, this);
            HCChartObj = hc.chart;
            conf = hc[CONFIGKEY];

            //create the smartLabel instance
            hc.labels.smartLabel = conf.smartLabel = iapi.smartLabel;
            //svae the width and height
            iapi.width = width;
            iapi.height = height;
            // legend snap literals calculated based on the width, height in conf object
            conf.width = width;
            conf.height = height;
            plotOptions = hc.plotOptions;

            // If roundedges is enabled
            HCChartObj.useRoundEdges  = FCChartObj.useroundedges == 1;
            //store all tooltext related attributes in conf
            conf.tooltext = FCChartObj.plottooltext;
            conf.targettooltext = FCChartObj.targettooltext;
            //is the chart 3d
            HCChartObj.is3D = is3d = conf.is3d = /3d$/.test(defaultSeries);
            palleteString = is3d ? lib.chartPaletteStr.chart3D : lib.chartPaletteStr.chart2D;

            //fiend defaultseries type depemding upon chart's name
            HCChartObj.defaultSeriesType = defaultSeries;
            ////palette////
            paletteIndex = FCChartObj.palette > 0 && FCChartObj.palette < 6 ?
            FCChartObj.palette : pluckNumber(iapi.paletteIndex, 1);
            ////reduce by 1 for array positining
            paletteIndex -= 1;
            //save the palette index for further reference
            HCChartObj.paletteIndex = paletteIndex;

            // Creating a copy of colorrange to get the colorrange value
            colorArr = extend2({}, obj.colorrange);
            iapi.colorRangeGetter = new ColorRange(colorArr.color, undefined,
                iapi.defaultPaletteOptions.paletteColors[paletteIndex], this);

            //save the FC Linkclick function
            HCChartObj.events.click = hc.plotOptions.series.point.events.click = iapi.linkClickFN;

            // Full Chart as a hotspot
            if (pluck(FCChartObj.clickurl) !== undefined) {
                HCChartObj.link = FCChartObj.clickurl;
                HCChartObj.style.cursor = 'pointer';
                //change the point Click event ot make similar as FC
                hc.plotOptions.series.point.events.click = function () {
                    HCChartObj.events.click.call({
                        link : FCChartObj.clickurl
                    });
                };
            }

            //////////Chart font style////////////////////
            inCanfontFamily = pluck(FCChartObj.basefont, 'Verdana,sans'),
            inCanfontSize =  pluckFontSize(FCChartObj.basefontsize, 10),
            inCancolor = pluck(FCChartObj.basefontcolor, colorM.getColor('baseFontColor')),
            outCanfontFamily = pluck(FCChartObj.outcnvbasefont, inCanfontFamily),
            fontSize = pluckFontSize(FCChartObj.outcnvbasefontsize, inCanfontSize),
            outCanfontSize = fontSize + PXSTRING,
            outCancolor = pluck(FCChartObj.outcnvbasefontcolor, inCancolor).
            replace(/^#?([a-f0-9]+)/ig, '#$1');


            inCanfontSize =  inCanfontSize + PXSTRING;
            inCancolor = inCancolor.replace(/^#?([a-f0-9]+)/ig, '#$1');

            //create style for tredn tendtext
            //save it in the hc JSON for ferther refrence
            /** @todo replace trendStyle as outcanvasStyle */
            iapi.trendStyle = iapi.outCanvasStyle = {
                fontFamily: outCanfontFamily,
                color: outCancolor,
                fontSize:  outCanfontSize
            };
            outCanLineHeight = setLineHeight(iapi.trendStyle);

            iapi.inCanvasStyle = {
                fontFamily: inCanfontFamily,
                fontSize:  inCanfontSize,
                color: inCancolor
            };

            inCanLineHeight = setLineHeight(iapi.inCanvasStyle);

            //create style for tredn tendtext
            //save it in the hc JSON for ferther refrence
            /** @todo replace trendStyle as outcanvasStyle */
            conf.trendStyle = conf.outCanvasStyle = {
                fontFamily: outCanfontFamily,
                color: outCancolor,
                fontSize:  outCanfontSize
            };

            //legend
            extend2(hc.legend, {
                title: {
                    style: {
                        fontFamily: pluck(FCChartObj.legendcaptionfont, outCanfontFamily),
                        fontSize:  pluckNumber(FCChartObj.legendcaptionfontsize, fontSize) + 'px',
                        color: hashify(pluck(FCChartObj.legendcaptionfontcolor, outCancolor)),
                        fontWeight: pluckNumber(FCChartObj.legendcaptionfontbold, 1) ? 'bold' : 'normal'
                    },
                    align: TEXT_ANCHOR_MAP[pluck(FCChartObj.legendcaptionalignment)]
                },
                itemStyle: {
                    fontFamily: pluck(FCChartObj.legenditemfont, outCanfontFamily),
                    fontSize:  pluckNumber(FCChartObj.legenditemfontsize, fontSize) + 'px',
                    color: hashify( pluck(FCChartObj.legenditemfontcolor, outCancolor)),
                    fontWeight: pluckNumber(FCChartObj.legenditemfontbold) ? 'bold' : 'normal'
                },
                itemHiddenStyle: {
                    fontFamily: outCanfontFamily,
                    fontSize:  fontSize + 'px',
                    color: hashify(pluck(FCChartObj.legenditemhiddencolor, outCancolor))
                },
                itemHoverStyle: {
                    color: hashify(pluck(FCChartObj.legenditemhoverfontcolor, FCChartObj.legenditemfontcolor,
                        outCancolor))
                }
            });

            hc.legend.title.style.lineHeight = setLineHeight(hc.legend.title.style);
            hc.legend.itemStyle.lineHeight = setLineHeight(hc.legend.itemStyle);
            hc.legend.itemHiddenStyle.lineHeight = setLineHeight(hc.legend.itemHiddenStyle);

            ///datalabels
            fontBdrColor = getFirstValue(FCChartObj.valuebordercolor,
                BLANKSTRING);
            fontBdrColor = fontBdrColor ? convertColor(
                fontBdrColor, pluckNumber(FCChartObj.valueborderalpha,
                FCChartObj.valuealpha, 100)) : BLANKSTRING;

            dataLabelsStyle = plotOptions.series.dataLabels.style = {
                fontFamily: pluck(FCChartObj.valuefont, inCanfontFamily),
                fontSize: pluck(FCChartObj.valuefontsize, pInt(inCanfontSize, 10)) + PXSTRING,
                color: convertColor(pluck(FCChartObj.valuefontcolor, inCancolor),
                    pluckNumber(FCChartObj.valuefontalpha,
                    FCChartObj.valuealpha, 100)),
                fontWeight: pluckNumber(FCChartObj.valuefontbold) ? 'bold' :
                    'normal',
                fontStyle: pluckNumber(FCChartObj.valuefontitalic) ? 'italic' :
                    'normal',
                border: fontBdrColor || FCChartObj.valuebgcolor ?
                    (pluckNumber(FCChartObj.valueborderthickness, 1) + 'px solid') :
                        undefined,
                borderColor: fontBdrColor,
                borderThickness: pluckNumber(FCChartObj.valueborderthickness, 1),
                borderPadding: pluckNumber(FCChartObj.valueborderpadding, 2),
                borderRadius: pluckNumber(FCChartObj.valueborderradius, 0),
                backgroundColor: FCChartObj.valuebgcolor ?
                    convertColor(FCChartObj.valuebgcolor,
                    pluckNumber(FCChartObj.valuebgalpha, FCChartObj.valuealpha,
                    100)) : BLANKSTRING,
                borderDash: pluckNumber(FCChartObj.valueborderdashed, 0) ?
                    getDashStyle(pluckNumber(FCChartObj.valueborderdashlen, 4),
                    pluckNumber(FCChartObj.valueborderdashgap, 2),
                    pluckNumber(FCChartObj.valueborderthickness, 1)) : 'none'
            };
            setLineHeight(dataLabelsStyle);

            //special attr for datalabels color
            /** @todo Do this after the style tag parsing. */
            plotOptions.series.dataLabels.color = dataLabelsStyle.color;

            if (iapi.isDataLabelBold) {
                dataLabelsStyle.fontWeight = 'bold';
                delete dataLabelsStyle.lineHeight;
                setLineHeight(dataLabelsStyle);
            }

            ///tooltip
            hc.tooltip.style = {
                fontFamily: inCanfontFamily,
                fontSize:  inCanfontSize,
                lineHeight : inCanLineHeight,
                color: inCancolor
            };

            ///set the caption font style
            hc.title.style = {
                fontFamily: pluck(FCChartObj.captionfont, outCanfontFamily),
                color: pluck(FCChartObj.captionfontcolor, outCancolor).
                    replace(/^#?([a-f0-9]+)/ig, '#$1'),
                fontSize: pluckNumber(FCChartObj.captionfontsize, (fontSize + 3)) + PXSTRING,
                fontWeight: pluckNumber(FCChartObj.captionfontbold) === 0 ? 'normal' : 'bold'
            };
            hc.title.align = pluck(FCChartObj.captionalignment, POSITION_CENTER);
            hc.title.isOnTop = pluckNumber(FCChartObj.captionontop, 1);
            hc.title.alignWithCanvas = pluckNumber(FCChartObj.aligncaptionwithcanvas, iapi.alignCaptionWithCanvas, 1);
            hc.title.horizontalPadding = pluckNumber(FCChartObj.captionhorizontalpadding,
                (hc.title.alignWithCanvas ? 0 : 15));

            setLineHeight(hc.title.style);
            hc.subtitle.style = {
                fontFamily: pluck(FCChartObj.subcaptionfont, FCChartObj.captionfont, outCanfontFamily),
                color: pluck(FCChartObj.subcaptionfontcolor, FCChartObj.captionfontcolor, outCancolor).
                    replace(/^#?([a-f0-9]+)/ig, '#$1'),
                fontSize: (pluckNumber(FCChartObj.subcaptionfontsize,
                    (pluckNumber(mathMax(pluckNumber(FCChartObj.captionfontsize) - 3, -1), fontSize) +
                    pluckNumber(this.subTitleFontSizeExtender, 1))) + PXSTRING),
                fontWeight: pluckNumber(FCChartObj.subcaptionfontbold, this.subTitleFontWeight,
                    FCChartObj.captionfontbold) === 0 ? 'normal' : 'bold'
            };
            hc.subtitle.align = hc.title.align;
            hc.subtitle.isOnTop = hc.title.isOnTop;
            hc.subtitle.alignWithCanvas = hc.title.alignWithCanvas;
            hc.subtitle.horizontalPadding = hc.title.horizontalPadding;

            setLineHeight(hc.subtitle.style);

            //trendPointStyle
            hc.chart.trendPointStyle = {
                style: iapi.trendStyle
            };

            //Annotations default style
            hc.orphanStyles = {
                defaultStyle: {
                    style: extend2({}, iapi.inCanvasStyle)
                }
            };

            // Creating colorRangeStyle style
            hc.chart.colorRangeStyle = {
                style: {
                    fontFamily: inCanfontFamily,
                    fontSize:  inCanfontSize,
                    lineHeight : inCanLineHeight,
                    color: inCancolor
                }
            };
            setLineHeight(hc.chart.colorRangeStyle);



            //**decide the scale factor**//

            scaleOnResize = pluckNumber(FCChartObj.scaleonresize, 1);

            HCChartObj.origW = origW = pluckNumber(FCChartObj.origw, scaleOnResize ?
                iapi.origRenderWidth : width);
            HCChartObj.origH = origH = pluckNumber(FCChartObj.origh, scaleOnResize ?
                iapi.origRenderHeight : height);

            // Whether to auto-scale itself with respect to previous size
            HCChartObj.autoScale = autoScale = pluckNumber(FCChartObj.autoscale , 1);

            if (autoScale) {
                scaleFactor = getScaleFactor(origW, origH, width, height);
            }
            else {
                scaleFactor = 1;
            }
            iapi.scaleFactor = HCChartObj.scaleFactor = scaleFactor;

            //create the gaugeAxis if requared
            if (iapi.createGaugeAxis) {
                iapi.createGaugeAxis(obj, hc, {
                    fontFamily: outCanfontFamily,
                    fontSize:  outCanfontSize,
                    lineHeight : outCanLineHeight,
                    color: outCancolor
                });
            }

            //////set styles//////////
            iapi.parseStyles(hc);

            //after applying the style do the

            // Deleting background style for not to effect the background cosmetics
            // for 3.2.2 relelease.
            delete hc.xAxis.labels.style.backgroundColor;
            delete hc.xAxis.labels.style.borderColor;

            delete hc.yAxis[0].labels.style.backgroundColor;
            delete hc.yAxis[0].labels.style.borderColor;

            delete hc.yAxis[1].labels.style.backgroundColor;
            delete hc.yAxis[1].labels.style.borderColor;

            // Point configuration to show label tooltext and data values
            iapi.showTooltip = pluckNumber(FCChartObj.showtooltip, iapi.showTooltip, 1);
            iapi.tooltipSepChar = pluck(FCChartObj.tooltipsepchar, COMMASPACE);
            iapi.showValues = pluckNumber(FCChartObj.showvalues, FCChartObj.showvalue, iapi.showValues, 1);
            iapi.seriesNameInToolTip = pluckNumber(FCChartObj.seriesnameintooltip, 1);
            if (!iapi.showTooltip) {
                hc.tooltip.enabled = false;
            }

            /** @todo Apply Style Object */

            hc.plotOptions.series.connectNullData = pluckNumber(FCChartObj.connectnulldata, 0);

            // ------------------------- COSMETICS -----------------------------//
            //Background properties - Gradient
            // create the back-ground color
            ////Finaly Set the Plot and Background color[must be modifyed al last as margins may be changed any where]
            HCChartObj.backgroundColor = {
                FCcolor : {
                    color : pluck(FCChartObj.bgcolor, colorM.getColor(palleteString.bgColor)),
                    alpha : pluck(FCChartObj.bgalpha, colorM.getColor(palleteString.bgAlpha)),
                    angle : pluck(FCChartObj.bgangle, colorM.getColor(palleteString.bgAngle)),
                    ratio : pluck(FCChartObj.bgratio, colorM.getColor(palleteString.bgRatio))
                }
            };

            showBorder = pluckNumber(FCChartObj.showborder, is3d ? 0 : 1);

            HCChartObj.borderWidth = showBorder ? pluckNumber(FCChartObj.borderthickness, 1) : 0;
            HCChartObj.borderRadius = pluckNumber(FCChartObj.borderradius, 0);
            HCChartObj.borderDashStyle = pluckNumber(FCChartObj.borderdashed, 0) ?
                getDashStyle(pluckNumber(FCChartObj.borderdashlen, 4),
                pluckNumber(FCChartObj.borderdashgap, 2), HCChartObj.borderWidth) : undefined;


            //Border Properties of chart
            HCChartObj.borderColor = convertColor(pluck(FCChartObj.bordercolor, is3d ? '#666666' :
                colorM.getColor('borderColor')),
                pluck(FCChartObj.borderalpha,  is3d ? '100' : colorM.getColor('borderAlpha')));

            // Manage canvas cosmetics
            HCChartObj.plotBackgroundColor = HCChartObj.plotBorderColor = COLOR_TRANSPARENT;
            HCChartObj.plotBorderWidth = 0;
            HCChartObj.plotShadow = 0;

            // Chart background image
            /* Attributes for customize bg image
            bgImage (String)
            bgImageAlpha    (0-100)
            bgImageDisplayMode  (none, stretch, center, fill, fit, tile )
            bgImageVAlign   (top, middle, bottom)
            bgImageHAlign   (left, middle, right)
            bgImageScale    (0-300)
             */

            TILE = 'tile',
            FILL = 'fill',
            FIT = 'fit';
            HCChartObj.bgSWF = pluck(FCChartObj.bgimage, FCChartObj.bgswf);
            HCChartObj.bgSWFAlpha = pluckNumber(FCChartObj.bgimagealpha, FCChartObj.bgswfalpha, 100);
            // Set background swf param
            bgImageDisplayMode = pluck(FCChartObj.bgimagedisplaymode, 'none').toLowerCase();
            bgImageVAlign = getValidValue(FCChartObj.bgimagevalign, BLANKSTRING).toLowerCase();
            bgImageHAlign = getValidValue(FCChartObj.bgimagehalign, BLANKSTRING).toLowerCase();
            //when background mode is tile, fill and fit then default value of vertical alignment
            // and horizontal alignment will be middle and middle
            if (bgImageDisplayMode == TILE || bgImageDisplayMode == FILL || bgImageDisplayMode == FIT) {
                if (bgImageVAlign != POSITION_TOP && bgImageVAlign != POSITION_MIDDLE &&
                    bgImageVAlign != POSITION_BOTTOM) {
                    bgImageVAlign = POSITION_MIDDLE;
                }
                if (bgImageHAlign != 'left' && bgImageHAlign != POSITION_MIDDLE && bgImageHAlign != 'right') {
                    bgImageHAlign = POSITION_MIDDLE;
                }
            }
            else {
                if (bgImageVAlign != POSITION_TOP && bgImageVAlign != POSITION_MIDDLE &&
                    bgImageVAlign != POSITION_BOTTOM) {
                    bgImageVAlign = POSITION_TOP;
                }
                if (bgImageHAlign != 'left' && bgImageHAlign != POSITION_MIDDLE && bgImageHAlign != 'right') {
                    bgImageHAlign = 'left';
                }
            }
            HCChartObj.bgImageDisplayMode = bgImageDisplayMode;
            HCChartObj.bgImageVAlign = bgImageVAlign;
            HCChartObj.bgImageHAlign = bgImageHAlign;
            HCChartObj.bgImageScale = pluckNumber(FCChartObj.bgimagescale, 100);

            // LOGO URL (foreground) logo parameters
            HCChartObj.logoURL = getValidValue(FCChartObj.logourl);
            HCChartObj.logoPosition = pluck(FCChartObj.logoposition, 'tl').toLowerCase();
            HCChartObj.logoAlpha = pluckNumber(FCChartObj.logoalpha, 100);
            HCChartObj.logoLink = getValidValue(FCChartObj.logolink);
            HCChartObj.logoScale = pluckNumber(FCChartObj.logoscale, 100);
            HCChartObj.logoLeftMargin = pluckNumber(FCChartObj.logoleftmargin, 0);
            HCChartObj.logoTopMargin = pluckNumber(FCChartObj.logotopmargin, 0);

            //Delay in rendering annotations that are over the chart
            HCChartObj.annRenderDelay = getValidValue(FCChartObj.annrenderdelay);

            //Tool Tip - Show/Hide, Background Color, Border Color, Separator Character
            tooltipStyle = hc.tooltip.style;
            tooltipStyle.backgroundColor = convertColor(pluck(tooltipStyle.backgroundColor,
                FCChartObj.tooltipbgcolor, FCChartObj.hovercapbgcolor, FCChartObj.hovercapbg,
                colorM.getColor('toolTipBgColor')), pluck(FCChartObj.tooltipbgalpha, 100));
            tooltipStyle.borderColor = convertColor(pluck(tooltipStyle.borderColor,
                FCChartObj.tooltipbordercolor, FCChartObj.hovercapbordercolor, FCChartObj.hovercapborder,
                colorM.getColor('toolTipBorderColor')), pluck(FCChartObj.tooltipborderalpha, 100));

            hc.tooltip.constrain = pluckNumber(FCChartObj.constraintooltip, 1);
            hc.tooltip.shadow = pluckNumber(FCChartObj.showtooltipshadow, FCChartObj.showshadow, 1) ? {
                enabled: true,
                opacity: mathMax(pluckNumber(FCChartObj.tooltipbgalpha, 100),
                    pluckNumber(FCChartObj.tooltipborderalpha,100)) / 100
            } : false;
            tooltipStyle.borderWidth = pluckNumber(FCChartObj.tooltipborderthickness, 1) + 'px';
            if (FCChartObj.tooltipborderradius) {
                tooltipStyle.borderRadius = pluckNumber(FCChartObj.tooltipborderradius, 1) + 'px';
            }
            hc.tooltip.style.padding =
            pluckNumber(FCChartObj.tooltippadding, iapi.tooltippadding, 3) + 'px';
            if (FCChartObj.tooltipcolor) {
                tooltipStyle.color = getFirstColor(FCChartObj.tooltipcolor);
            }

            /*
            // delete following styles to prevent IE to draw double border of the tooltext.
            tooltipStyle.backgroundColor = undefined;
            tooltipStyle.borderColor = undefined;
            tooltipStyle.border = undefined;
            */

            // Whether to rotate the values
            HCChartObj.rotateValues = pluckNumber(FCChartObj.rotatevalues, 0);
            // placevaluesinside
            HCChartObj.placeValuesInside = pluckNumber(FCChartObj.placevaluesinside, 0);
            // valuePosition for line and area
            HCChartObj.valuePosition = FCChartObj.valueposition;
            // valuePosition for line and area
            HCChartObj.valuePadding = pluckNumber(FCChartObj.valuepadding, 4);

            // Plot shadow effect. Note that this is overridden in the if-block
            // below.
            hc.plotOptions.series.shadow = pluckNumber(FCChartObj.showshadow,
                FCChartObj.showcolumnshadow,
                iapi.defaultPlotShadow, iapi.colorManager.getColor('showShadow'));


            if (HCChartObj.useRoundEdges) {
                hc.plotOptions.series.shadow = pluckNumber(FCChartObj.showshadow,
                    FCChartObj.showcolumnshadow, 1);
                hc.plotOptions.series.borderRadius = 1;
                hc.tooltip.borderRadius = 2;
            }

            //Title
            hc.title.text = parseUnsafeString(FCChartObj.caption);

            //SubTitle
            hc.subtitle.text = parseUnsafeString(FCChartObj.subcaption);

            ///////// tooltip Options//////////////
            if (FCChartObj.showtooltip == ZEROSTRING) { //area/line ancor conflict
                hc.tooltip.enabled =  false;
            }

            //set the plotspace ppercent has effecton column only
            plotSpacePercent = pluckNumber(FCChartObj.plotspacepercent, 20);
            if (plotSpacePercent > 80 || plotSpacePercent < 0) {
                plotSpacePercent = 20;
            }
            //set the plot space percent
            iapi.plotSpacePercent = hc.plotOptions.series.groupPadding = plotSpacePercent / 200;

            iapi.parseExportOptions(hc);

            //-------------------------- Realtime properties -------------------------------//
            HCChartObj.dataStreamURL = pluck(FCChartObj.datastreamurl, '');
            HCChartObj.refreshInterval = pluckNumber(FCChartObj.refreshinterval, 1);
            HCChartObj.dataStamp = FCChartObj.datastamp;
            HCChartObj.useMessageLog = pluckNumber(FCChartObj.usemessagelog, 0);
            //should not be more than 100 percent.
            HCChartObj.messageLogWPercent = mathMin((pluckNumber(FCChartObj.messagelogwpercent, 80)), 100);
            HCChartObj.messageLogHPercent = mathMin((pluckNumber(FCChartObj.messageloghpercent, 70)), 100);
            HCChartObj.messageLogShowTitle = pluckNumber(FCChartObj.messagelogshowtitle, 1);
            HCChartObj.messageLogTitle = pluck(FCChartObj.messagelogtitle, 'Message Log');
            HCChartObj.messageLogColor = pluck(FCChartObj.messagelogcolor, '#fbfbfb');
            HCChartObj.messageGoesToJS = pluckNumber(FCChartObj.messagegoestojs, 0);
            HCChartObj.messageGoesToLog = pluckNumber(FCChartObj.messagegoestolog, 1);
            HCChartObj.messageJSHandler = pluck(FCChartObj.messagejshandler, '');
            HCChartObj.messagePassAllToJS = pluckNumber(FCChartObj.messagepassalltojs, 0);
            HCChartObj.messageLogIsCancelable = pluckNumber(FCChartObj.messagelogiscancelable, 1);
            HCChartObj.alwaysShowMessageLogMenu = pluckNumber(FCChartObj.alwaysshowmessagelogmenu,
                                                    HCChartObj.useMessageLog);

            HCChartObj.showRTMenuItem = pluckNumber(FCChartObj.showrtmenuitem, 0);

            //-------------------------- Gauge specific properties --------------------------//
            //Gauge Border properties
            showGaugeBorder = pluckNumber(FCChartObj.showgaugeborder, 1);
            HCChartObj.gaugeBorderColor = pluck(FCChartObj.gaugebordercolor, iapi.gaugeBorderColor, '333333');
            HCChartObj.gaugeBorderThickness = showGaugeBorder ? pluckNumber(FCChartObj.gaugeborderthickness,
                                                iapi.gaugeBorderThickness, 2) : 0;
            HCChartObj.gaugeBorderAlpha = pluck(FCChartObj.gaugeborderalpha, HUNDREDSTRING);
            //Gauge fill color
            HCChartObj.gaugeFillColor = pluck(FCChartObj.gaugefillcolor, FCChartObj.ledbgcolor, '000000');
            //Whether to use same fill color?
            HCChartObj.useSameFillColor = pluckNumber(FCChartObj.usesamefillcolor, 0);
            //Same color for back ground
            HCChartObj.useSameFillBgColor = pluckNumber(FCChartObj.usesamefillbgcolor, HCChartObj.useSameFillColor);

            //Gauge fill properties
            // (BULLET and Linear Gauge)
            HCChartObj.colorRangeFillMix = getFirstDefinedValue(FCChartObj.colorrangefillmix,
                FCChartObj.gaugefillmix, iapi.colorRangeFillMix,
                '{light-10},{dark-10},{light-10},{dark-10}');
            HCChartObj.colorRangeFillRatio = getFirstDefinedValue(FCChartObj.colorrangefillratio,
                FCChartObj.gaugefillratio, iapi.colorRangeFillRatio, FCChartObj.gaugefillratio,
                '0,10,80,10');
            //Gauge Border properties
            HCChartObj.showColorRangeBorder = pluckNumber(FCChartObj.showcolorrangeborder,
                FCChartObj.showgaugeborder, iapi.showColorRangeBorder, 0);
            HCChartObj.colorRangeBorderColor = pluck(FCChartObj.colorrangebordercolor,
                FCChartObj.gaugebordercolor, '{dark-20}');
            HCChartObj.colorRangeBorderThickness = showGaugeBorder ? pluckNumber(FCChartObj.colorrangeborderthickness,
                FCChartObj.gaugeborderthickness, 1) : 0;
            HCChartObj.colorRangeBorderAlpha = pluckNumber(FCChartObj.colorrangeborderalpha,
                FCChartObj.gaugeborderalpha, 100);
            HCChartObj.roundRadius = pluckNumber(FCChartObj.roundradius,
                FCChartObj.gaugeroundradius, 0);
            //Round radius - if gauge is to be drawn as rounded
            HCChartObj.showShadow = pluckNumber(FCChartObj.showshadow, 1);

            //-------------------------- Gauge specific properties --------------------------//
            HCChartObj.gaugeType = pluckNumber(FCChartObj.gaugetype, iapi.gaugeType, 1);
            //HCObj.scale.reverseScale = (HCChartObj.gaugeType === 2 || HCChartObj.gaugeType === 3) ? 1 : 0;


            if (iapi.preSeriesAddition) {
                iapi.preSeriesAddition(hc, obj, width, height);
            }

            //create the Data serias first
            iapi.series(obj, hc, chartName, width, height);

            //this function do the after series addition works like:
            // showsum for stacking
            //marimekko conf
            if (iapi.postSeriesAddition) {
                iapi.postSeriesAddition(hc, obj, width, height);
            }

            // Configure Axis add all the ticks and trend points
            if (iapi.configureAxis) {
                iapi.configureAxis(hc, obj);
            }

            /*
             *Manage the space
             */
            if (iapi.spaceManager) {
                iapi.spaceManager(hc, obj, width, height);
            }

            iapi.postSpaceManager && iapi.postSpaceManager();

            // Create macro literals
            iapi.updateSnapPoints && iapi.updateSnapPoints(hc);

            // Create macro literals
            iapi.latestDataUpdater && iapi.latestDataUpdater(hc, obj, width, height);

            //toolbar button parameters
            toolbar = HCChartObj.toolbar = {button: {}};
            button = toolbar.button;

            button.scale = pluckNumber(FCChartObj.toolbarbuttonscale, 1.15);
            button.width = pluckNumber(FCChartObj.toolbarbuttonwidth, 15);
            button.height = pluckNumber(FCChartObj.toolbarbuttonheight, 15);
            button.radius = pluckNumber(FCChartObj.toolbarbuttonradius, 2);
            button.spacing = pluckNumber(FCChartObj.toolbarbuttonspacing, 5);

            button.fill = convertColor(pluck(FCChartObj.toolbarbuttoncolor, 'ffffff'));
            button.labelFill = convertColor(pluck(FCChartObj.toolbarlabelcolor, 'cccccc'));
            button.symbolFill = convertColor(pluck(FCChartObj.toolbarsymbolcolor, 'ffffff'));
            button.hoverFill = convertColor(pluck(FCChartObj.toolbarbuttonhovercolor, 'ffffff'));
            button.stroke = convertColor(pluck(FCChartObj.toolbarbuttonbordercolor, 'bbbbbb'));
            button.symbolStroke = convertColor(pluck(FCChartObj.toolbarsymbolbordercolor, '9a9a9a'));

            button.strokeWidth = pluckNumber(FCChartObj.toolbarbuttonborderthickness, 1);
            button.symbolStrokeWidth = pluckNumber(FCChartObj.toolbarsymbolborderthickness, 1);
            bSymbolPadding = button.symbolPadding = pluckNumber(FCChartObj.toolbarsymbolpadding, 5);
            button.symbolHPadding = pluckNumber(FCChartObj.toolbarsymbolhpadding, bSymbolPadding);
            button.symbolVPadding = pluckNumber(FCChartObj.toolbarsymbolvpadding, bSymbolPadding);

            bPosition = toolbar.position = pluck(FCChartObj.toolbarposition, 'tr').toLowerCase();
            switch(bPosition) {
                case 'tr':
                case 'tl':
                case 'br':
                case 'bl':
                    break;
                default:
                    bPosition = 'tr';
            }
            bHAlign = toolbar.hAlign = (BLANKSTRING + FCChartObj.toolbarhalign).toLowerCase() === 'left' ?
                                            'l': bPosition.charAt(1);
            bVAlign = toolbar.vAlign = (BLANKSTRING + FCChartObj.toolbarvalign).toLowerCase() === 'bottom' ?
                                            'b' : bPosition.charAt(0);
            hDirection = toolbar.hDirection = pluckNumber(FCChartObj.toolbarhdirection, (bHAlign === 'r' ? -1 : 1));
            vDirection = toolbar.vDirection = pluckNumber(FCChartObj.toolbarvdirection, (bVAlign === 'b' ? -1 : 1));
            toolbar.vMargin = pluckNumber(FCChartObj.toolbarvmargin, 6);
            toolbar.hMargin = pluckNumber(FCChartObj.toolbarhmargin, 10);
            toolbar.x = pluckNumber(FCChartObj.toolbarx, bHAlign === 'l' ? 0: width);
            toolbar.y = pluckNumber(FCChartObj.toolbary, bVAlign === 't' ? 0: height);

            /*jslint devel:true */
            if (win.console && win.console.log && win.FC_DEV_ENVIRONMENT) {
                console.log(hc);
            }
            /*jslint devel:false */

            // Draw button for the RT Charts menu items
            if (pluckNumber(FCChartObj.showrtmenuitem, 0)) {
                (hc.callbacks ||
                    (hc.callbacks = [])).push(iapi.drawRTMenuButtons);
            }

            //RT Charts menu is not required but message logger is running
            //need to create a separate message logger menu
            //If user has opted not show message logger menu from the beginning
            //do not add this method to callback. We will invoke the method
            //directly from message logger component on receipt of first log
            else if(HCChartObj.useMessageLog && HCChartObj.alwaysShowMessageLogMenu){
                (hc.callbacks ||
                        (hc.callbacks = [])).push(iapi.drawMLMenuButtons);
            }

            //return the converted object
            return hc;
        },

        drawMLMenuButtons: function () {
            var chart = this,
                options = chart.options,
                chartOptions = options.chart,
                menu = chart.menu || (chart.menu = []),
                toolbar = chart.toolbar,
                conf = options[CONFIGKEY],
                outCanvasStyle = conf && conf.outCanvasStyle || chart.outCanvasStyle || {},
                menuItems;

            menu.push(menuItems = createContextMenu({
                chart: chart,
                basicStyle: outCanvasStyle,
                items: [{
                    text: 'Show Log',
                    visibility: HIDDEN,
                    onclick: function() {
                        lib && lib.messageLogger &&
                                lib.messageLogger.open();
                        // activate hide log
                        menuItems.showItem(4);
                        menuItems.hideItem(3);
                    }
                },{
                    //this is an invalid option as of now
                    //as the this menu will become inactive
                    //once the message logger is visible.
                    //In future this may become useful.
                    text: 'Hide Log',
                    visibility: HIDDEN,
                    onclick: function() {
                        lib && lib.messageLogger &&
                                lib.messageLogger.close();
                        // activate show log
                        menuItems.showItem(3);
                        menuItems.hideItem(4);
                    }
                }],
                position: {
                    x: chartOptions.spacingLeft,
                    y: chart.chartHeight - chartOptions.spacingBottom +
                        (!chartOptions.showFormBtn && !chartOptions.showRestoreBtn ? -15 : 10)
                }
            }));

            //initially deactive the hide log button
            //menuItems.hideItem(0);
            menuItems.hideItem(1);
            /*if(useMessageLog){
                menuItems.hideItem(1);
            }else{
                //no message logger needed hide all options.
                menuItems.hideItem(0);
                menuItems.hideItem(1);
            }*/

            chart.elements.configureButton = toolbar.add('loggerIcon', (function(x, y) {
                return function() {
                    if (menuItems.visible) {
                        menuItems.hide();
                        return;
                    }
                    menuItems.show({
                        x: x,
                        y: y + 1
                    });
                };
            }()), {
                x: chartOptions.spacingLeft,
                y: chart.chartHeight - chartOptions.spacingBottom +
                        (!chartOptions.showFormBtn &&
                                !chartOptions.showRestoreBtn ? -15 : 10),
                tooltip: 'Show & Hide Message'
            });
        },

        drawRTMenuButtons: function () {
            var chart = this,
                logic = chart.logic,
                hci = logic.chartInstance,
                options = chart.options,
                chartOptions = options.chart,
                alwaysShowMessageLogMenu = chartOptions && chartOptions.alwaysShowMessageLogMenu,
                menu = chart.menu || (chart.menu = []),
                toolbar = chart.toolbar,
                conf = options[CONFIGKEY],
                outCanvasStyle = conf && conf.outCanvasStyle || chart.outCanvasStyle || {},
                menuItems,
                isUpdateActive = hci.isUpdateActive || logic.eiMethods.isUpdateActive,
                isUpdating = isUpdateActive && isUpdateActive.call(hci);

            menu.push(menuItems = createContextMenu({
                chart: chart,
                basicStyle: outCanvasStyle,
                items: [{
                    text: 'Stop Update',
                    visibility: isUpdating ? VISIBLE : HIDDEN,
                    onclick: function() {
                        menuItems.hideItem(0);
                        menuItems.showItem(1);
                        hci.stopUpdate();
                    }
                }, {
                    text: 'Start Update',
                    visibility: isUpdating ? HIDDEN : VISIBLE,
                    onclick: function() {
                        menuItems.hideItem(1);
                        menuItems.showItem(0);
                        hci.restartUpdate();
                    }
                }, {
                    text: 'Clear Chart',
                    onclick: function() {
                        //add a selection method for start and end
                        hci.clearChart();
                    }
                },{
                    text: 'Show Log',
                    visibility: HIDDEN, // initially hidden
                    onclick: function() {
                        lib && lib.messageLogger &&
                                lib.messageLogger.open();
                        // activate hide log
                        menuItems.showItem(4);
                        menuItems.hideItem(3);
                    }
                },{
                    //this is an invalid option as of now
                    //as the this menu will become inactive
                    //once the message logger is visible.
                    //In future this may become useful.
                    text: 'Hide Log',
                    visibility: HIDDEN,
                    onclick: function() {
                        lib && lib.messageLogger &&
                                lib.messageLogger.close();
                        // activate show log
                        menuItems.showItem(3);
                        menuItems.hideItem(4);
                    }
                }],
                position: {
                    x: chartOptions.spacingLeft,
                    y: chart.chartHeight - chartOptions.spacingBottom +
                        (!chartOptions.showFormBtn && !chartOptions.showRestoreBtn ? -15 : 10)
                }
            }));

            //clear chart option should always be invisible for
            //real time widgets
            menuItems.hideItem(2);
            menuItems.hideItem(0);
            menuItems.hideItem(1);
            menuItems.showItem(isUpdating ? 0 : 1);

            //initially deactive the hide log button
            !alwaysShowMessageLogMenu && menuItems.hideItem(3);
            menuItems.hideItem(4);

            chart.elements.configureButton = toolbar.add('configureIcon', (function(x, y) {
                return function() {
                    if (menuItems.visible) {
                        menuItems.hide();
                        return;
                    }
                    menuItems.show({
                        x: x,
                        y: y + 1
                    });
                };
            }()), {
                x: chartOptions.spacingLeft,
                y: chart.chartHeight - chartOptions.spacingBottom +
                        (!chartOptions.showFormBtn &&
                                !chartOptions.showRestoreBtn ? -15 : 10),
                tooltip: 'Manage RealTime Update'
            });
        },

        // Update HC JSON with the last real-time updated value, if its there.
        // will help to render the Chart with latest real-time data updated
        latestDataUpdater: function (hc) {
            var chartInstance = this.chartInstance,
            lastUpdatedData,
            series = hc.series &&  hc.series,
            data = series && series[0] && series[0].data,
            i, length, dataObj;

            if ((lastUpdatedData = (chartInstance && chartInstance.jsVars &&
                chartInstance.jsVars._rtLastUpdatedData)) && data) {
                for (i = 0, length = lastUpdatedData.values && lastUpdatedData.values.length; i < length; i += 1) {
                    dataObj = data[i];
                    if (dataObj) {
                        dataObj.y = lastUpdatedData.values[i];
                        dataObj.displayValue = lastUpdatedData.labels[i];
                        dataObj.toolText = lastUpdatedData.toolTexts[i];
                    }
                }
            }
        },

        /* jshint camelcase: false*/
        styleApplicationDefinition_font: function (HC, toObj, style) {
        /* jshint camelcase: true*/
            var styleobject, x, y, isDataValues = false, i, len, styleobjectI,
            fontStyleMap = this.styleMapForFont;

            switch (toObj) {//fiend the toobject of HC depending upon toobject string of FC
                case 'caption':
                    styleobject = HC.title;
                    break;

                case 'datalabels':
                    styleobject = HC.plotOptions.series.dataLabels;
                    break;

                case 'value':
                    styleobject = HC.plotOptions.series.dataLabels;
                    break;

                case 'datavalues':
                    styleobject = HC.plotOptions.series.dataLabels;
                    isDataValues = true;
                    break;

                case 'subcaption':
                    styleobject = HC.subtitle;
                    break;

                case 'tooltip':
                    styleobject = HC.tooltip;
                    break;

                case 'trendvalues':
                    styleobject = HC.chart.trendPointStyle;
                    break;

                case 'xaxisname':
                    styleobject = HC.xAxis.title;
                    break;

                case 'vlinelabels':
                    styleobject = {
                        style : HC[CONFIGKEY].divlineStyle
                    };
                    break;

                case 'gaugelabels':
                    styleobject = HC.chart.colorRangeStyle;
                    break;

                case 'tickvalues':
                    styleobject = HC.scale.tickValues;
                    break;

                case 'limitvalues':
                    styleobject = HC.scale.limitValues;
                    break;

                case 'openvalue':
                    styleobject = HC.chart.openValue;
                    break;

                case 'closevalue':
                    styleobject = HC.chart.closeValue;
                    break;

                case 'highlowvalue':
                    styleobject = HC.chart.highLowValue;
                    break;

                case 'legend':
                    styleobject = {
                        style : HC.legend.itemStyle
                    };
                    break;

                default:
                    //to prevent error send a dummy styleObj
                    HC.orphanStyles[toObj] = styleobject = {
                        text: '',
                        style : {}
                    };
                    break;
            }

            if (typeof styleobject === 'object') {
                if (styleobject instanceof Array) {
                    for (i = 0, len = styleobject.length; i < len; i += 1) {
                        styleobjectI = styleobject[i];
                        for (x in style) {//add all style attr into the hc object
                            y = x.toLowerCase();
                            if (typeof fontStyleMap[y] === 'function') {
                                fontStyleMap[y](style[x], styleobjectI, isDataValues);
                            }
                        }
                        setLineHeight(styleobjectI.style);
                    }
                }
                else {
                    for (x in style) {//add all style attr into the hc object
                        y = x.toLowerCase();
                        if (typeof fontStyleMap[y] === 'function') {
                            fontStyleMap[y](style[x], styleobject, isDataValues);
                        }
                    }
                    setLineHeight(styleobject.style);
                }
            }
        },

        createGaugeAxis: function (FCObj, HCObj, labelStyle) {
            var FCChartObj = FCObj.chart,
            colorM = this.colorManager,
            numberFormatter = this.numberFormatter,
            axisPosition = this.isHorizontal ? (pluckNumber(FCChartObj.ticksbelowgauge, FCChartObj.ticksbelowgraph,
                this.ticksbelowgauge, 1) ? AXISPOSITION_BOTTOM : AXISPOSITION_TOP) :
                (pluckNumber(FCChartObj.ticksonright,
                this.ticksOnRight, 1) ? AXISPOSITION_RIGHT : AXISPOSITION_LEFT),
            /** @todo try to use HighhChart axis obj */
            // Tick properties
            majorTMColor = pluck(FCChartObj.majortmcolor, colorM.getColor('tickColor')),
            majorTMAlpha = pluckNumber(FCChartObj.majortmalpha, 100),
            majorTMHeight = pluckNumber(pluckNumber(FCChartObj.majortmheight) * this.scaleFactor,
                                this.majorTMHeight, 6),
            tickValueStep = pluckNumber(FCChartObj.tickvaluestep, FCChartObj.tickvaluesstep , 1),
            showTickMarks = pluckNumber(FCChartObj.showtickmarks, 1),
            connectTickMarks = showTickMarks ? pluckNumber(FCChartObj.connecttickmarks, this.connectTickMarks, 1) : 0,
            showTickValues = pluckNumber(FCChartObj.showtickvalues, showTickMarks),
            majorTMThickness = pluckNumber(FCChartObj.majortmthickness, 1),
            upperlimit = pluckNumber(numberFormatter.getCleanValue(FCChartObj.upperlimit)),
            lowerlimit = pluckNumber(numberFormatter.getCleanValue(FCChartObj.lowerlimit)),
            reverseScale = pluckNumber(FCChartObj.reversescale, 0) == 1;

            //reverse the scale if it is vertical
            if(!this.isHorizontal) {
                reverseScale = !reverseScale;
            }

            //Cannot be less than 1
            tickValueStep = tickValueStep < 1 ? 1 : tickValueStep;

            HCObj.scale = {
                min: null,
                max: null,
                axisPosition : axisPosition,
                //Tick properties
                showTickMarks: showTickMarks,
                // Whether to display ticks values or not
                showTickValues: showTickValues,
                // Whether to display the Limits
                showLimits: pluckNumber(FCChartObj.showlimits, showTickValues),
                //Whether to automatically adjust TM
                adjustTM: Boolean(pluckNumber(FCChartObj.adjusttm, 1)),
                majorTMNumber: pluckNumber(FCChartObj.majortmnumber, -1),
                majorTMColor: convertColor(majorTMColor, majorTMAlpha),
                majorTMHeight: showTickMarks ? majorTMHeight : 0,
                majorTMThickness: majorTMThickness,
                minorTMNumber: pluckNumber(FCChartObj.minortmnumber, this.minorTMNumber, 4),
                minorTMColor: convertColor(pluck(FCChartObj.minortmcolor, majorTMColor),
                    pluckNumber(FCChartObj.minortmalpha, majorTMAlpha)),
                minorTMHeight: showTickMarks ? pluckNumber(pluckNumber(FCChartObj.minortmheight,
                    FCChartObj.minortmwidth) * this.scaleFactor, mathRound(majorTMHeight / 2)) : 0,
                minorTMThickness: pluckNumber(FCChartObj.minortmthickness, 1),
                //Padding between tick mark start position and gauge
                tickMarkDistance: pluckNumber(pluckNumber(FCChartObj.tickmarkdistance, FCChartObj.tickmarkgap) *
                    this.scaleFactor, this.tickMarkDistance, 3),
                //Tick value distance
                tickValueDistance: pluckNumber(pluckNumber(FCChartObj.tickvaluedistance,
                                    FCChartObj.displayvaluedistance) * this.scaleFactor, 2) + 2,//text gutter
                placeTicksInside: pluckNumber(FCChartObj.placeticksinside, 0),
                placeValuesInside: pluckNumber(FCChartObj.placevaluesinside, 0),
                //Tick value step
                tickValueStep: tickValueStep,
                // CONFIGURATION //
                // Adaptive yMin - if set to true, the min will be based on the values
                // provided. It won't be set to 0 in case of all positive values
                setAdaptiveMin: pluckNumber(FCChartObj.setadaptivemin, 0),
                // The upper and lower limits of y and x axis
                upperLimit: upperlimit,
                lowerLimit: lowerlimit,
                //Display values for upper and lower limit
                upperLimitDisplay: getValidValue(FCChartObj.upperlimitdisplay),
                lowerLimitDisplay: getValidValue(FCChartObj.lowerlimitdisplay),
                // Whether to draw the recerse LED Gauge or not
                reverseScale: reverseScale,
                connectorColor: convertColor(pluck(FCChartObj.connectorcolor, majorTMColor),
                                    pluckNumber(FCChartObj.connectoralpha, majorTMAlpha)),
                connectorThickness: connectTickMarks ? pluckNumber(FCChartObj.connectorthickness, majorTMThickness) : 0,
                majorTM: [],
                minorTM: [],
                trendPoint : [],
                labels: {
                    style: extend2({}, labelStyle)
                },
                tickValues: {
                    style: extend2({}, labelStyle)
                },
                limitValues: {
                    style: extend2({}, labelStyle)
                }
            };
        },

        configureAxis: function (HCObj, FCObj) {
            var FCChartObj = FCObj.chart,
            series = HCObj.series[0],
            pAxis,
            min, max,
            trendPointArr,
            trendPointObj,
            colorM = this.colorManager,
            trendPointLength,
            i, startValue, endValue,
            dashStyle,
            colorRangeGetter = this.colorRangeGetter,
            colorArrTemp = colorRangeGetter && colorRangeGetter.colorArr,
            length = colorArrTemp && colorArrTemp.length,
            firstColor = colorArrTemp && colorArrTemp[0],
            lastColor = colorArrTemp && colorArrTemp[length - 1],
            minDataValue = this.minDataValue,
            maxDataValue = this.maxDataValue,
            scale = HCObj.scale,
            lowerLimit = scale.lowerLimit,
            upperLimit = scale.upperLimit,
            numberFormatter = this.numberFormatter,
            isZone;


            if (series) {
                if(defined(minDataValue) && defined(maxDataValue)) {
                    lowerLimit = lowerLimit <= minDataValue ? lowerLimit : firstColor && firstColor.minvalue;
                    upperLimit = upperLimit >= maxDataValue ? upperLimit : lastColor && lastColor.maxvalue;
                }
                else {
                    lowerLimit = pluckNumber(lowerLimit, firstColor && firstColor.minvalue);
                    upperLimit = pluckNumber(upperLimit, lastColor && lastColor.maxvalue);
                }

                pAxis = new GaugeAxis(lowerLimit, upperLimit, false, scale, this.numberFormatter);
                pAxis.calculateLimits(this.maxDataValue, this.minDataValue);
                //Calcuate tick marks - based on the initial data.
                pAxis.calculateTicks();
                //Store copy of tick marks in local array
                scale.majorTM = pAxis.getMajorTM();
                scale.minorTM = pAxis.getMinorTM();
                // Store the limits
                min = scale.min = pAxis.min;
                max = scale.max = pAxis.max;

                //if the chart has trend point then add it
                if (FCObj.trendpoints && (trendPointArr = FCObj.trendpoints.point) &&
                    (trendPointLength = trendPointArr.length) > 0) {
                    scale.trendPoint = [];
                    for (i = 0; i < trendPointLength; i += 1) {
                        trendPointObj = trendPointArr[i];
                        dashStyle = pluckNumber(trendPointObj.dashed, 0) ?
                            getDashStyle(pluck(Math.max(trendPointObj.dashlen, trendPointObj.thickness), 4),
                                pluckNumber(trendPointObj.dashgap, 3), pluckNumber(trendPointObj.thickness, 1))
                            : undefined;


                        startValue = pluckNumber(trendPointObj.startvalue, trendPointObj.value);
                        endValue = pluckNumber(trendPointObj.endvalue, startValue);
                        isZone = startValue !== endValue;

                        if (startValue <= max && startValue >= min && endValue <= max && endValue >= min) {
                            scale.trendPoint.push({
                                style : extend2(extend2(HCObj.chart.trendPointStyle.style),
                                {
                                    //color : parseColor(pluck(trendPointObj.bordercolor, trendPointObj.color,
                                    // colorM.getTrendDarkColor()))
                                }),
                                startValue : startValue,
                                endValue : endValue,
                                tooltext : getValidValue(parseUnsafeString(trendPointObj.markertooltext)),
                                displayValue : getValidValue(parseUnsafeString(trendPointObj.displayvalue),
                                    isZone ? BLANKSTRING : numberFormatter.scale(startValue)),//fix for FWXT-603
                                showOnTop: pluckNumber(trendPointObj.showontop, FCChartObj.ticksbelowgauge,
                                            FCChartObj.ticksbelowgraph, 1),
                                color: pluck(trendPointObj.color, colorM.getColor('trendLightColor')),
                                alpha: pluckNumber(trendPointObj.alpha, 99),
                                thickness: pluckNumber(trendPointObj.thickness, 1),
                                dashStyle: dashStyle,
                                //Marker properties
                                useMarker: pluckNumber(trendPointObj.usemarker, 0),
                                markerColor: convertColor(pluck(trendPointObj.markercolor,
                                    trendPointObj.color, colorM.getColor('trendLightColor')), 100),
                                markerBorderColor: convertColor(pluck(trendPointObj.markerbordercolor,
                                    trendPointObj.bordercolor, colorM.getColor('trendDarkColor')), 100),
                                markerRadius: pluckNumber(pluckNumber(trendPointObj.markerradius) *
                                                this.scaleFactor, 5),
                                markerToolText: getFirstValue(trendPointObj.markertooltext),
                                trendValueDistance : pluckNumber(pluckNumber(trendPointObj.trendvaluedistance,
                                    FCChartObj.trendvaluedistance) * this.scaleFactor, scale.tickValueDistance),
                                //calcullated
                                isZone : isZone,

                                //extra for angular gauge
                                valueInside : pluckNumber(trendPointObj.valueinside, FCChartObj.placevaluesinside, 0),
                                showBorder : pluckNumber(trendPointObj.showborder, 1),
                                borderColor : convertColor(pluck(trendPointObj.bordercolor, trendPointObj.color,
                                                colorM.getColor('trendDarkColor')),
                                    pluckNumber(trendPointObj.borderalpha, trendPointObj.alpha, 100)),
                                radius : pluckNumber(pluckNumber(trendPointObj.radius) * this.scaleFactor),
                                innerRadius: pluckNumber(pluckNumber(trendPointObj.innerradius) * this.scaleFactor)

                            });

                            parseColor(pluck(trendPointObj.bordercolor, trendPointObj.color,
                                colorM.getColor('trendDarkColor')));
                        }
                    }

                    // Sorting the trend point array because the labels have to
                    // be space managed in case of hlineargauge.
                    if (this.defaultSeriesType === 'lineargauge') {
                        lib.stableSort && lib.stableSort(scale.trendPoint, function (a, b) {
                            return (a.startValue - b.startValue);
                        });
                    }
                }
            }
        },

        // Space-Management for placing the vertical tick marks
        placeTickMark: function (hcJSON, minCanvasWidth, minCanvasHeight) {
            var smartLabel = this.smartLabel,
            HCChartObj = hcJSON.chart, canvasWidth = this.width - (HCChartObj.marginRight + HCChartObj.marginLeft),
            canvasHeight = this.height - (HCChartObj.marginTop + HCChartObj.marginBottom),
            scale = hcJSON.scale,
            min = scale.min,
            max = scale.max,
            axisPosition = scale.axisPosition,
            minorTMHeight = scale.minorTMHeight,
            majorTMHeight = scale.majorTMHeight,
            showLimits = scale.showLimits,
            showTickValues = scale.showTickValues,
            tickMarkDistance = scale.tickMarkDistance,
            tickValueDistance = scale.tickValueDistance,
            tickMaxHeight = Math.max(majorTMHeight, minorTMHeight),
            placeTicksInside = scale.placeTicksInside,
            placeValuesInside = scale.placeValuesInside,
            reverseScale = scale.reverseScale,
            distance = 0,
            labelX = 0,
            labelY = 0,
            i = 1,
            tickObj,
            lastIndex = scale.majorTM.length - 1,
            isHorizontal = (axisPosition === 2 || axisPosition === 4) ? false : true,
            smartTickLabelObj,
            fontSize,
            lineHeight,
            lineHeightHalf,
            labelShiftX = 6,
            maxDistance = isHorizontal ? canvasHeight - minCanvasHeight : canvasWidth - minCanvasWidth,
            maxLabelsUsedSpace = 0,
            TMvalueDistance,
            maxTextW,
            nonTextSpace,
            maxTextH,
            tickValuesStyle = scale.tickValues.style,
            limitValuesStyle = scale.limitValues.style;

            if (scale.majorTM[0] && scale.majorTM[1]) {
                TMvalueDistance = scale.majorTM[1].value - scale.majorTM[0].value;
            }

            if (!placeTicksInside) {
                distance += tickMarkDistance + tickMaxHeight;
            }


            if (showTickValues || showLimits) {

                smartLabel.setStyle(limitValuesStyle);
                fontSize = pluckNumber(parseInt(limitValuesStyle.fontSize, 10), 10);
                lineHeight = pluckNumber(parseInt(limitValuesStyle.lineHeight, 10), 12);
                lineHeightHalf = lineHeight / 2;

                if (!placeValuesInside) {
                    distance += tickValueDistance;
                }

                if (axisPosition === 3) {
                    labelY = fontSize;
                }

                if (isHorizontal) {
                    maxTextH = maxDistance - distance;
                    maxTextW = ((canvasWidth / (max - min)) * TMvalueDistance / 2) + 6;// shift the text little outer
                }
                else {
                    maxTextW = maxDistance - distance;
                    maxTextH = ((canvasHeight / (max - min)) * TMvalueDistance) +
                                lineHeightHalf; //shift the text little outer
                }


                if (scale.majorTM[0]){
                    tickObj = scale.majorTM[0];
                    if(tickObj.isString) {
                        if (tickObj.displayValue) {
                            smartTickLabelObj = smartLabel.getSmartText(tickObj.displayValue, maxTextW, maxTextH);
                            tickObj.displayValue = smartTickLabelObj.text;
                            tickObj._oriText = smartTickLabelObj.oriText;
                            smartTickLabelObj.tooltext && (tickObj.originalText = smartTickLabelObj.tooltext);

                            if (!isHorizontal) {
                                maxLabelsUsedSpace = Math.max(maxLabelsUsedSpace, smartTickLabelObj.width);
                                tickObj.labelY =  fontSize - (reverseScale ? smartTickLabelObj.height - lineHeightHalf :
                                                    lineHeightHalf);
                                tickObj.labelX = labelX;
                            }
                            else {
                                maxLabelsUsedSpace = Math.max(maxLabelsUsedSpace, smartTickLabelObj.height);
                                tickObj.labelY = ((axisPosition === 1 && !placeValuesInside) ||
                                    (axisPosition === 3 && placeValuesInside)) ? fontSize - smartTickLabelObj.height :
                                        labelY;
                                labelShiftX = Math.min(6, smartTickLabelObj.width / 2);
                            }
                        }
                    }
                    else {
                        i = 0;
                    }
                    if (isHorizontal) {
                        if (reverseScale) {
                            tickObj.labelX = labelShiftX;
                            tickObj.align = POSITION_RIGHT;
                        }
                        else {
                            tickObj.labelX = -labelShiftX;
                            tickObj.align = POSITION_LEFT;
                        }
                    }
                }
                if (scale.majorTM[lastIndex]){
                    tickObj = scale.majorTM[lastIndex];
                    if(tickObj.isString) {
                        if (tickObj.displayValue) {
                            smartTickLabelObj = smartLabel.getSmartText(tickObj.displayValue, maxTextW, maxTextH);
                            tickObj.displayValue = smartTickLabelObj.text;
                            tickObj._oriText = smartTickLabelObj.oriText;
                            smartTickLabelObj.tooltext && (tickObj.originalText = smartTickLabelObj.tooltext);

                            if (!isHorizontal) {
                                maxLabelsUsedSpace = Math.max(maxLabelsUsedSpace, smartTickLabelObj.width);
                                tickObj.labelY =  fontSize - (reverseScale ? lineHeightHalf : smartTickLabelObj.height -
                                    lineHeightHalf);
                                tickObj.labelX = labelX;
                            }
                            else {
                                maxLabelsUsedSpace = Math.max(maxLabelsUsedSpace, smartTickLabelObj.height);
                                tickObj.labelY = ((axisPosition === 1 && !placeValuesInside) ||
                                    (axisPosition === 3 && placeValuesInside)) ? fontSize - smartTickLabelObj.height :
                                        labelY;
                                labelShiftX = Math.min(6, smartTickLabelObj.width / 2);

                            }
                        }
                    }
                    else {
                        labelShiftX = 6;
                        lastIndex += 1;
                    }
                    if (isHorizontal) {
                        if (reverseScale) {
                            tickObj.labelX = -labelShiftX;
                            tickObj.align = POSITION_LEFT;
                        }
                        else {
                            tickObj.labelX = labelShiftX;
                            tickObj.align = POSITION_RIGHT;
                        }
                    }
                }


                //calculate nonLimitLabels
                for (; i < lastIndex; i++) {

                    if (i === 0 || i === lastIndex - 1) {
                        smartLabel.setStyle(limitValuesStyle);
                        fontSize = pluckNumber(parseInt(limitValuesStyle.fontSize, 10), 10);
                        lineHeight = pluckNumber(parseInt(limitValuesStyle.lineHeight, 10), 12);
                        if (isHorizontal) {
                            labelY = ((axisPosition === 1 && placeValuesInside) ||
                                (axisPosition === 3 && !placeValuesInside)) ? fontSize : 0;
                        }
                    } else {
                        smartLabel.setStyle(tickValuesStyle);
                        fontSize = pluckNumber(parseInt(tickValuesStyle.fontSize, 10), 10);
                        lineHeight = pluckNumber(parseInt(tickValuesStyle.lineHeight, 10), 12);
                        if (isHorizontal) {
                            labelY = ((axisPosition === 1 && placeValuesInside) ||
                                (axisPosition === 3 && !placeValuesInside)) ? fontSize : 0;
                        }
                    }

                    tickObj = scale.majorTM[i];
                    if (tickObj.displayValue) {
                        tickObj.labelX = pluckNumber(tickObj.labelX, labelX);
                        if (!isHorizontal) {
                            smartTickLabelObj = smartLabel.getOriSize(tickObj.displayValue);
                            maxLabelsUsedSpace = Math.max(maxLabelsUsedSpace, smartTickLabelObj.width);
                            tickObj.labelY = fontSize - (smartTickLabelObj.height / 2);
                        }
                        else {
                            maxLabelsUsedSpace = Math.max(maxLabelsUsedSpace, lineHeight);
                            tickObj.labelY = labelY;
                        }
                    }
                }

            }

            nonTextSpace = distance;
            if (!placeValuesInside) {
                distance += maxLabelsUsedSpace;
            }

            distance = Math.min(maxDistance, distance);

            if (!placeValuesInside) {
                scale._labelUsedSpace = distance - nonTextSpace;
            }
            else {
                scale._labelUsedSpace = maxLabelsUsedSpace;
            }

            switch (axisPosition) {
                case 1 : // TOP
                    HCChartObj.marginTop += distance;
                    break;
                case 2 : // RIGHT
                    HCChartObj.marginRight += distance;
                    break;
                case 3 : // BOTTOM
                    HCChartObj.marginBottom += distance;
                    break;
                case 4 : // LEFT
                    HCChartObj.marginLeft += distance;
                    break;
            }
            return distance;
        },

        // eiMethods contains all the methods that we want to be defined on the
        // main chart object (FusionCharts). Will be used primarily for setting
        // and fetching chart data.
        eiMethods: /** @lends FusionCharts# */ {

            /**
             * This function feeds real-time data to real-time charts and gauges. The function accepts a string
             * containing the real-time data.
             * @group chart-realtime
             * @see FusionCharts#setData
             * @see FusionCharts#getData
             * @param {string} stream
             */
            feedData: function (stream) {

                var chartObj = this,
                vars = chartObj.jsVars,
                hcObj = vars.hcObj,
                iapi = hcObj.logic,
                seriesZero = hcObj.options && hcObj.options.series &&
                    hcObj.options.series[0],
                prevData,
                update;

                if (chartObj.isActive() && iapi && iapi.linearDataParser &&
                    (update = iapi.linearDataParser(stream, iapi.multisetRealtime))) {

                    // Hold on to the current data before updating, so that it
                    // can be sent as "prevData" to rt events.
                    prevData = chartObj.getDataJSON();

                    if (hcObj.realtimeUpdate) {
                        hcObj.realtimeUpdate(update);
                    }
                    else if (hcObj.logic.realtimeUpdate) {
                        hcObj.logic.realtimeUpdate(update);
                    }
                    else {
                        seriesZero && seriesZero.realtimeUpdate && seriesZero.realtimeUpdate(update);
                    }

                    vars._rtLastUpdatedData = iapi.multisetRealtime ? update :
                    chartObj.getDataJSON();

                    // This event is also raised when the edit mode is enabled and
                    // user completes one drag operation.
                    /**
                     * This event is fired once the real time update of the chart is complete .
                     *
                     * @event FusionCharts#realTimeUpdateComplete
                     * @group chart-realtime
                     *
                     * @param {string} data The data stream .
                     * @param {object} updateObject The new data with which the chart should be updated with .
                     * @param {string} source The name of the source,usually 'feedData'
                     * @param {string} url url of the data source
                     */
                    global.raiseEvent('realtimeUpdateComplete', {
                        data: stream,
                        updateObject: update,
                        prevData: prevData.values,
                        source: 'feedData',
                        url: null
                    }, vars.fcObj);

                    try {
                        /* jshint camelcase: false*/
                        win.FC_ChartUpdated && win.FC_ChartUpdated(vars.fcObj.id);
                        /* jshint camelcase: true*/
                    }
                    catch (err) {
                        setTimeout(function () {
                            throw (err);
                        }, 0);
                    }

                    return true;
                }

                return false;
            },

            /**
             * This function returns the value of the data set on real-time charts and gauges.
             * @group chart-realtime
             * @see FusionCharts#setData
             * @see FusionCharts#feedData
             */
            getData: function () {
                var traverse,
                    dataObj,
                    data = (traverse = this.jsVars) && (traverse = traverse.hcObj) &&
                        (traverse = traverse.options) && (traverse = traverse.series) &&
                        (traverse = traverse[0]) && (traverse = traverse.data);

                dataObj = data && data[0];

                if (dataObj) {
                    return pluckNumber(dataObj.value, dataObj.y);
                }

                return null;
            },

            /**
             * This function feeds real-time data to real-time gauges. In single value gauges (LEDs, Bulb, Cylinder,
             * Thermometer) the function takes a numeric value as the parameter. For Angular gauge and Horizontal Linear
             * gauge, this function accepts two parameters - the dial number and the value to update.
             *
             * @group chart-realtime
             * @see FusionCharts#feedData
             * @see FusionCharts#getData
             * @param {string} value
             * @param {string} label
             */
            setData: function (value, label) {
                var stream = '';

                if ((value && value.toString) || value === '' || value === 0) {
                    stream = 'value=' + value.toString();
                }
                if ((label && label.toString) || label === '') {
                    stream = stream + '&label=' + label.toString();
                }
                if (stream) {
                    this.feedData(stream);
                }
            },

            /**
             * @group chart-realtime
             * @see FusionCharts#startUpdate
             * @see FusionCharts#restartUpdate
             * @see FusionCharts#isUpdateActive
             * @see FusionCharts#clearChart
             */
            stopUpdate: function (source) {
                var chartObj = this,
                state = chartObj.__state;

                clearTimeout(state._toRealtime);
                state._rtAjaxObj && state._rtAjaxObj.abort();

                state._rtPaused = true;
                /**
                 * This event is raised when the real time update of the chart is stopped .
                 *
                 * @event Fusioncharts#realTimeUpdateStopped
                 * @group chart-realtime
                 */
                global.raiseEvent('realimeUpdateStopped', {
                    source: source
                }, chartObj);
            },

            /**
             * @group chart-realtime
             * @see FusionCharts#startUpdate
             * @see FusionCharts#stopUpdate
             * @see FusionCharts#isUpdateActive
             * @see FusionCharts#clearChart
             */
            restartUpdate: function () {
                var chartObj = this,
                state = chartObj.__state;

                if (state._rtDataUrl && state._rtPaused) {
                    state._rtPaused = false;
                    state._rtAjaxObj.get(state._rtDataUrl);
                }
            },

            /**
             * @group chart-realtime
             * @see FusionCharts#startUpdate
             * @see FusionCharts#stopUpdate
             * @see FusionCharts#clearChart
             * @see FusionCharts#restartUpdate
             */
            isUpdateActive: function () {
                var state = this.__state;

                return !state._rtPaused;
            },
            /**
             * This function is used to clear the entire canvas when a real-time chart is being updated.
             *
             * An alternative to using this function is to select the "Clear Chart" option from real-time context menu.
             * The real-time context menu can be activated by setting the `showRTMenuItem` attribute to `1` in chart
             * configuration.
             * @group chart-realtime
             * @see FusionCharts#startUpdate
             * @see FusionCharts#stopUpdate
             * @see FusionCharts#isUpdateActive
             * @see FusionCharts#restartUpdate
             * @fires FusionCharts#chartCleared
             */
            clearChart: function (_source) {

                var jsVars = this.jsVars,
                    traverse,
                    min;

                _source = (_source && _source.toString && _source.toString());
                if ((traverse = jsVars.hcObj) && (traverse = traverse.options) &&
                    (traverse = traverse.scale)) {
                    min = traverse.min;
                    if (!isNaN(min)) {
                        /** @todo run this in a loop for every pointer in case
                         of angular and linear. If that can't be done then
                         override this eiMethod for each of them. */
                        this.jsVars.hcObj.fusionCharts.feedData('&showLabel=0&value=' + min);
                        /**
                         * This event is raised when the entire canvas is cleared by calling
                         * {@link FusionCharts#clearChart} or by clicking the context menu in real-time charts.
                         *
                         * @event FusionCharts#chartCleared
                         * @group chart-realtime
                         * @see FusionCharts#clearChart
                         */
                        lib.raiseEvent('chartCleared', {
                            source: _source
                        }, this, [this.id, _source]);
                    }
                }
            },

            /**
             * @note getDataJSON for multi-set RT charts have been separatelly
             * defined.
             */
            getDataJSON: function () {
                var i = 0, traverse, len, dataObj, values = [], labels = [], toolTexts = [],
                data = (traverse = this.jsVars) && (traverse = traverse.hcObj) &&
                (traverse = traverse.options) && (traverse = traverse.series) &&
                (traverse = traverse[0]) && (traverse = traverse.data);

                if (!data || !data.length) {
                    len = 0;
                } else {
                    len = data.length;
                }

                for (;i < len; i += 1) {
                    dataObj = data[i];
                    values.push(pluckNumber(dataObj.value, dataObj.y));
                    labels.push(dataObj.displayValue || '');
                    toolTexts.push(dataObj.toolText || '');
                }

                return {
                    values: values,
                    labels: labels,
                    toolTexts: toolTexts
                };
            },

            showLog: function () {
                return this.feedData('showLog=1');
            },

            hideLog: function () {
                return this.feedData('hideLog=1');
            },

            clearLog: function () {
                return this.feedData('clearLog=1');
            }
        },

        linearDataParser: function (responseText, multiSet) {
            /* Commands to handle:
             * label, value, toolText, showLabel, link, color, vLine and related params(?),
             * clear, stopUpdate, pointerId related updates,
             */
            var AMPERSAND = '&',
                EQUALS = '=',
                PIPE = '|',
                COMMA =',',
                MULTIVALUECOMMANDS = {
                    values: COMMASTRING,
                    colors: COMMASTRING,
                    toolTexts: COMMASTRING,
                    links: function (str) {
                        var tokenArray = [],
                            i,
                            ii;

                        str = str.replace(escapedComma, '_fc_escaped_comma_');
                        tokenArray = str.split(',');

                        i = 0, ii = tokenArray.length;

                        for (; i < ii; i += 1) {
                            tokenArray[i] = tokenArray[i].replace(/_fc_escaped_comma_/ig, ',');
                        }

                        return tokenArray;
                    },
                    valueVisibility: COMMASTRING
                },
                iapi = this,
                fci = iapi.chartInstance,
                commands,
                command,
                params,
                i,
                l,
                updateObj = {},
                dimension = 0;

            // clean value
            responseText = responseText && responseText.toString &&
            responseText.toString() || '';

            // split the commands.
            commands = responseText.split(AMPERSAND);

            for (i = 0, l = commands.length; i < l; i += 1) {

                // for every command, separate the command name and its values.
                command = commands[i].split(EQUALS);
                params = command[1];
                command = command[0];

                // no need to process improper data strings as of now.
                if (command === BLANKSTRING || command === undefined ||
                    params === undefined ||
                    (params === BLANKSTRING && !multiSet)) {
                    continue;
                }

                // desensitize case.
                command = command.toLowerCase();

                switch (command) {
                    case 'label':
                        updateObj.labels = params.split(COMMA);
                        break;

                    case 'vline':
                        updateObj.vlines = params.split(COMMA);
                        break;
                    case 'vlinelabel':
                        updateObj.vlineLabels = params.split(COMMA);
                        break;
                    case 'vlinecolor':
                        updateObj.vlineColors = params.split(COMMA);
                        break;
                    case 'vlinethickness':
                        updateObj.vlineThickness = params.split(COMMA);
                        break;
                    case 'vlinedashed':
                        updateObj.vlineDashed = params.split(COMMA);
                        break;

                    case 'value':
                        updateObj.values = params.split(PIPE);
                        dimension = 1;
                        break;

                    case 'showlabel':
                        updateObj.showLabels = params.split(COMMA);
                        break;

                    case 'showvalue':
                        updateObj.valueVisibility = params.split(PIPE);
                        break;

                    case 'tooltext':
                        updateObj.toolTexts = params.split(PIPE);
                        break;

                    case 'link':
                        updateObj.links = params.split(PIPE);
                        break;

                    case 'color':
                        updateObj.colors = params.split(PIPE);
                        break;

                    case 'datastamp':
                        updateObj.dataStamp = params;
                        break;

                    case 'stopupdate':
                        updateObj.pause = (params == '1');
                        break;

                    case 'clear':
                        updateObj.clear = (params == '1');
                        break;

                    default:
                        updateObj[command] = params;

                }
            }

            if (multiSet) {
                if (!updateObj.values) {
                    updateObj.values = [];
                }

                i = updateObj.values.length;
                while (i--) {
                    for (command in MULTIVALUECOMMANDS) {
                        if (updateObj[command]) {
                            if (typeof MULTIVALUECOMMANDS[command] === 'function') {
                                updateObj[command][i] &&
                                    (updateObj[command][i] =
                                        MULTIVALUECOMMANDS[command].call(this, updateObj[command][i]));
                            }
                            else {
                                updateObj[command][i] &&
                                    (updateObj[command][i] =
                                        updateObj[command][i].split(MULTIVALUECOMMANDS[command]));
                            }
                        }
                        else {
                            updateObj[command] = [];
                        }
                    }
                    dimension = mathMax(updateObj.values[i].length, dimension); // store the max
                }
            }

            if (updateObj.labels) {
                dimension = mathMax(dimension, updateObj.labels.length);
            }

            updateObj.dimension = dimension;

            if (updateObj.pause && fci.stopUpdate) {
                fci.stopUpdate('datastream');
            }

            return updateObj;
        },

        // For the Bulb Gauge or the Gauge where xml contains only one value
        // inside <value> element we don't need to call the different Point function
        // series is enough to handle that
        series: function () {
            var iapi = this,
                def = iapi.dataObj,
                opt = iapi.hcJSON,
                serie = def.pointers && def.pointers.pointer || def.value,
                chartAttrs = def.chart,
                colorRange = iapi.colorRangeGetter,
                colorArray = colorRange && colorRange.colorArr,
                colorCount = colorArray && colorArray.length,

                series = {},
                data = series.data = [],
                i,
                ii,
                value;

            // Disable legend.
            opt.legend.enabled = false;


            // If serie data is not array, then we re structure possible legacy
            // formats.
            if (!isArray(serie)) {
                serie = (typeof serie !== 'object') ? [{
                    value: serie
                }] : [serie];
            }

            // Build series data. For multivalue gauge we parse all provided
            // data, but for single value, we only parse the first one.
            for (i = 0, ii = iapi.multiValueGauge ? serie.length : 1; i < ii; i++) {
                data.push(iapi.getPointStub(serie[i], i, opt, def));
            }

            // We set the serie data to the first series.
            opt.series[0] = series;

            // If color range exists then include the min and max from color range
            // to recalculate min and max of the gauge scale.
            if (colorCount && iapi.pointValueWatcher &&
                    pluckNumber(chartAttrs.includecolorrangeinlimits,
                        iapi.includeColorRangeInLimits)) {
                value = pluckNumber(colorArray[0].minvalue);
                if (defined(value)) {
                    iapi.pointValueWatcher(value);
                }

                value = pluckNumber(colorArray[colorCount - 1].maxvalue);
                if (defined(value)) {
                    iapi.pointValueWatcher(value);
                }
            }
        },

        pointValueWatcher: function (valueY) {
            if (valueY !== null) {
                this.maxDataValue = this.maxDataValue > valueY ? this.maxDataValue : valueY;
                this.minDataValue = this.minDataValue < valueY ? this.minDataValue : valueY;
            }
        },

        updateSnapPoints: function(hc) {

            var instance = this,
                optionsChart = hc.chart,
                cw = instance.width,
                ch = instance.height,
                mgnB = optionsChart.marginBottom,
                mgnL = optionsChart.marginLeft,
                mgnR = optionsChart.marginRight,
                mgnT = optionsChart.marginTop,

                snaps = extend(instance.snapLiterals || (instance.snapLiterals = {}), {
                    chartstartx : 0,
                    chartstarty: 0,
                    chartwidth: cw,
                    chartheight: ch,
                    chartendx: cw,
                    chartendy: ch,
                    chartcenterx: cw / 2,
                    chartcentery: ch / 2,

                    chartbottommargin: mgnB,
                    chartleftmargin: mgnL,
                    chartrightmargin: mgnR,
                    charttopmargin: mgnT,

                    canvasstartx: mgnL,
                    canvasstarty: mgnT,
                    canvaswidth: cw - mgnL - mgnR,
                    canvasheight: ch - mgnT - mgnB,
                    canvasendx: cw - mgnR,
                    canvasendy: ch - mgnB
                });

            snaps.gaugestartx = snaps.canvasstartx;
            snaps.gaugestarty = snaps.canvasstarty;
            snaps.gaugeendx = snaps.canvasendx;
            snaps.gaugeendy = snaps.canvasendy;

            snaps.gaugecenterx = snaps.canvascenterx =
            mgnL + (snaps.canvaswidth / 2);
            snaps.gaugecentery = snaps.canvascentery =
            mgnT + (snaps.canvasheight / 2);
        }

    }, chartAPI.base);

    //linearScaleGauge

    chartAPI('linearscalegauge', {

        /** @todo fix the spacemanagement issue for vertical axis with long limit labels. */
        spaceManager: function (hcJSON, fcJSON, width, height) {
            var HCChartObj = hcJSON.chart,
            //labelStyle = series.dataLabels.style,
            canvasWidth = width - (HCChartObj.marginRight + HCChartObj.marginLeft),
            canvasHeight =  height - (HCChartObj.marginTop + HCChartObj.marginBottom),
            chartRight = HCChartObj.marginRight,
            chartLeft = HCChartObj.marginLeft,
            chartTop = HCChartObj.marginTop,
            chartBottom = HCChartObj.marginBottom,
            minCanW = canvasWidth * 0.3,
            minCanH = canvasHeight * 0.3,
            tickDimensions, captionWidth,
            rightLabel = 0;

            // Manage title Space
            if (this.manageTitleSpace && hcJSON.title.alignCaptionWithCanvas) {
                captionWidth = this.manageTitleSpace(hcJSON, fcJSON, canvasWidth / 2, canvasHeight / 2);
            }

            //manage scaleSpace
            if (this.placeTickMark) {
                tickDimensions = this.placeTickMark(hcJSON, minCanW, minCanH);
            }

            if (this.manageTitleSpace && !hcJSON.title.alignCaptionWithCanvas) {
                captionWidth = this.manageTitleSpace(hcJSON, fcJSON, canvasWidth / 2, canvasHeight / 2);
            }

            //manageDataLabelsSpace
            if (this.placeDataLabels) {
                rightLabel = this.placeDataLabels(hcJSON, minCanW, minCanH, chartTop, chartRight, chartBottom,
                    chartLeft, tickDimensions);
            }


            //manage other things if requared
            if (this.postDataLabelsPlacement) {
                this.postDataLabelsPlacement(hcJSON, minCanW, minCanH);
            }

            // Manage Caption alignment and canvasRight and left margins
            this.fixCaptionAlignment && this.fixCaptionAlignment(captionWidth, hcJSON, fcJSON, width, 0, rightLabel);

        },
        //manage space for title and subtitle at top
        manageTitleSpace : function (hcJSON, fcJSON, minCanvasWidth, minCanvasHeight){
            var iapi = this,
            HCChartObj = hcJSON.chart,
            canvasWidth = this.width - (HCChartObj.marginRight + HCChartObj.marginLeft),
            canvasHeight = this.height - (HCChartObj.marginTop + HCChartObj.marginBottom),
            titleObj = iapi.titleSpaceManager(hcJSON, fcJSON, canvasWidth,  canvasHeight - minCanvasHeight);

            return titleObj;
        },
        //can place one dataLabels at bottom
        placeDataLabels: function(hcJSON, minCanW, minCanH, chartTopSpace, chartRightSpace, chartBottomSpace) {
            var smartLabel = this.smartLabel,
            HCChartObj = hcJSON.chart,
            //labelStyle = series.dataLabels.style,
            canvasWidth = this.width - (HCChartObj.marginRight + HCChartObj.marginLeft),
            canvasHeight =  this.height - (HCChartObj.marginTop + HCChartObj.marginBottom),
            chartBottom = HCChartObj.marginBottom,
            smartDataLabel,
            dataLabels = hcJSON.plotOptions.series.dataLabels,
            style = dataLabels.style,
            lineHeight = pluckNumber(parseInt(style.lineHeight, 10), 12),
            maxAllowedHeight = canvasHeight - minCanH,
            valuePadding = HCChartObj.valuePadding,
            heightUsed = 0,
            point = hcJSON.series[0].data[0],
            ExtraSpace;
            if (point && point.displayValue !== BLANKSTRING) {
                smartLabel.setStyle(style);
                if (point.isLabelString) {
                    smartDataLabel = smartLabel.getSmartText(point.displayValue, canvasWidth,
                        maxAllowedHeight - valuePadding);
                    point.displayValue = smartDataLabel.text;
                    smartDataLabel.tooltext && (point.originalText = smartDataLabel.tooltext);
                }
                else {
                    smartDataLabel = smartLabel.getOriSize(point.displayValue);
                }
                //special fix for space string
                /** @todo will be removed when smartLabel will be able to handle it */
                if (point.displayValue === ' ') {
                    smartDataLabel = {
                        height : lineHeight
                    };
                }

                if (smartDataLabel.height > 0) {
                    heightUsed = smartDataLabel.height + valuePadding;
                }
                if (heightUsed > maxAllowedHeight) {
                    ExtraSpace = heightUsed - maxAllowedHeight;
                    valuePadding = ExtraSpace < valuePadding ? valuePadding - ExtraSpace : 0;
                    heightUsed = maxAllowedHeight;
                }
                HCChartObj.marginBottom += heightUsed;
                dataLabels.align = POSITION_CENTER;
                HCChartObj.valuePadding = chartBottom - chartBottomSpace + valuePadding;
            }
            return heightUsed;
        },
        //rearrange limit labels
        postDataLabelsPlacement : function (hcJSON) {
            var smartLabel = this.smartLabel,
            HCChartObj = hcJSON.chart, canvasWidth = this.width - (HCChartObj.marginRight + HCChartObj.marginLeft),
            canvasHeight = this.height - (HCChartObj.marginTop + HCChartObj.marginBottom),
            scale = hcJSON.scale,
            min = scale.min,
            max = scale.max,
            axisPosition = scale.axisPosition,
            style = scale.limitValues.style,
            reverseScale = scale.reverseScale,
            tickObj,
            lastIndex = scale.majorTM.length - 1,
            isHorizontal = (axisPosition === 2 || axisPosition === 4) ? false : true,
            smartTickLabelObj,
            fontSize = pluckNumber(parseInt(style.fontSize, 10), 10),
            lineHeight = pluckNumber(parseInt(style.lineHeight, 10), 12),
            lineHeightHalf = lineHeight / 2,
            labelShiftX,
            TMvalueDistance,
            maxTextW,
            maxTextH;

            if (scale.majorTM[0] && scale.majorTM[1]) {
                TMvalueDistance = scale.majorTM[1].value - scale.majorTM[0].value;
            }


            if (isHorizontal) {
                maxTextH = scale._labelUsedSpace;
                maxTextW = ((canvasWidth / (max - min)) * TMvalueDistance / 2) + 6;// shift the text little outer
            }
            else {
                maxTextW = scale._labelUsedSpace;
                maxTextH = ((canvasHeight / (max - min)) * TMvalueDistance) +
                    lineHeightHalf; //shift the text little outer
            }

            smartLabel.setStyle(style);

            if (scale.majorTM[0] && scale.majorTM[0].isString) {
                tickObj = scale.majorTM[0];
                if (tickObj.displayValue) {
                    smartTickLabelObj = smartLabel.getSmartText(tickObj._oriText, maxTextW, maxTextH);
                    tickObj.displayValue = smartTickLabelObj.text;
                    smartTickLabelObj.tooltext && (tickObj.originalText = smartTickLabelObj.tooltext);

                    if (!isHorizontal) {
                        tickObj.labelY =  fontSize -
                            (reverseScale ? smartTickLabelObj.height - lineHeightHalf : lineHeightHalf);
                    }
                    else {
                        labelShiftX = Math.min(6, smartTickLabelObj.width / 2);
                        if (reverseScale) {
                            tickObj.labelX = labelShiftX;
                        }
                        else {
                            tickObj.labelX = -labelShiftX;
                        }
                    }
                }
            }

            if (scale.majorTM[lastIndex] && scale.majorTM[lastIndex].isString) {
                tickObj = scale.majorTM[lastIndex];
                if (tickObj.displayValue) {
                    smartTickLabelObj = smartLabel.getSmartText(tickObj._oriText, maxTextW, maxTextH);
                    tickObj.displayValue = smartTickLabelObj.text;
                    smartTickLabelObj.tooltext && (tickObj.originalText = smartTickLabelObj.tooltext);
                    if (!isHorizontal) {
                        tickObj.labelY =  fontSize - (reverseScale ? lineHeightHalf : smartTickLabelObj.height -
                            lineHeightHalf);
                    }
                    else {
                        labelShiftX = Math.min(6, smartTickLabelObj.width / 2);
                        if (reverseScale) {
                            tickObj.labelX = -labelShiftX;
                        }
                        else {
                            tickObj.labelX = labelShiftX;
                        }
                    }
                }
            }
        },

        getPointStub: function (dataObj, i, HCObj, FCObj, label) {
            var HCConfig = HCObj[CONFIGKEY],
                colorM = this.colorManager,
                numberFormatter = this.numberFormatter,
                itemValue = numberFormatter.getCleanValue(dataObj.value),
                dataLink = getValidValue(dataObj.link),
                setToolText = getValidValue(parseUnsafeString(pluck(dataObj.tooltext, HCConfig.tooltext))),
                setDisplayValue = getValidValue(parseUnsafeString(dataObj.displayvalue)),
                formatedVal = numberFormatter.dataLabels(itemValue),
                colorCodeObj,
                toolText, displayValue,
                FCChartObj = FCObj.chart,
                showHoverEffect = pluckNumber(FCChartObj.showhovereffect),
                gaugeFillHoverColor,
                gaugeFillHoverAlpha,
                hoverAttr,
                outAttr,
                hasHoberFillMix,
                isLabelString;

            //create the tooltext
            if (!this.showTooltip) {
                toolText = false;
            }
            else if (setToolText !== undefined) {
                toolText = parseTooltext(setToolText, [1,2], {
                    formattedValue: formatedVal
                }, dataObj, FCChartObj);
                isLabelString = true;
            }
            else {//determine the dispalay value then
                toolText = formatedVal === null ? false :
                (label !== undefined) ? label + this.tooltipSepChar + formatedVal : formatedVal;
            }
            //create the displayvalue
            if (!pluckNumber(dataObj.showvalue, this.showValues)) {
                displayValue = BLANKSTRING;
            }
            else if (setDisplayValue !== undefined) {
                displayValue = setDisplayValue;
            }
            else {//determine the dispalay value then
                displayValue = getValidValue(formatedVal, ' ');
            }

            if (this.pointValueWatcher) {
                this.pointValueWatcher(itemValue);
            }

            if (this.getPointColorObj) {
                colorCodeObj = this.getPointColorObj(FCChartObj, itemValue);
            }
            if (showHoverEffect !== 0 && (showHoverEffect || FCChartObj.gaugefillhovercolor ||
                    FCChartObj.plotfillhovercolor || FCChartObj.gaugefillhoveralpha ||
                    FCChartObj.plotfillhoveralpha || FCChartObj.gaugefillhoveralpha === 0)) {
                showHoverEffect = true;
                gaugeFillHoverColor = pluck(FCChartObj.gaugefillhovercolor,
                    FCChartObj.plotfillhovercolor, FILLMIXDARK10);
                gaugeFillHoverAlpha = pluckNumber(FCChartObj.gaugefillhoveralpha,
                    FCChartObj.plotfillhoveralpha);
                hoverAttr = {};
                outAttr = {};
                outAttr.fluidColor = colorCodeObj.code;
                outAttr.fluidAlpha = colorCodeObj.alpha;
                hasHoberFillMix = /\{/.test(gaugeFillHoverColor);
                gaugeFillHoverColor = hasHoberFillMix ? colorM.parseColorMix(getValidValue(colorCodeObj.code, BLANK),
                    gaugeFillHoverColor)[0] : gaugeFillHoverColor;
                hoverAttr.fluidColor = gaugeFillHoverColor;
                hoverAttr.fluidAlpha = pluckNumber(gaugeFillHoverAlpha, colorCodeObj.alpha);
            }

            return {
                y: itemValue,
                displayValue : displayValue,
                toolText : toolText,
                isLabelString : isLabelString,
                color: convertColor(colorCodeObj.code, colorCodeObj.alpha),
                link: dataLink,
                colorRange: colorCodeObj,
                doNotSlice: true,
                rolloverProperties: {
                    enabled: showHoverEffect,
                    hoverAttr: hoverAttr,
                    outAttr: outAttr
                }
            };
        },

        //retuen the point color as an object
        getPointColorObj: function (FCChartObj, itemValue) {
            return this.colorRangeGetter.getColorObj(itemValue);
        }
    }, chartAPI.gaugebase);

    //LEDGauge
    chartAPI('led', {
        singleValued : true,
        isDataLabelBold: true,
        preSeriesAddition : function (HCJSON, FCJSON) {
            var FCChartObj = FCJSON.chart,
            HCChartObj = HCJSON.chart;
            //LED Gap & size
            HCChartObj.ledGap = pluckNumber(FCChartObj.ledgap, 2);
            HCChartObj.ledSize = pluckNumber(FCChartObj.ledsize, 2);
            HCChartObj.plotHoverEffect = pluckNumber(FCChartObj.showhovereffect, 0);
        }
    }, chartAPI.linearscalegauge);

    /* VLED Charts */
    chartAPI('vled', {
        friendlyName: 'Vertical LED Gauge',
        defaultSeriesType : 'led',
        defaultPlotShadow: 1,
        standaloneInit: true,
        realtimeEnabled: true,
        chartleftmargin: 15,
        chartrightmargin: 15,
        charttopmargin: 10,
        chartbottommargin: 10,
        showTooltip : 0,
        connectTickMarks: 0,
        rendererId: 'led',
        creditLabel: creditLabel
    }, chartAPI.led);

    /* HLED Charts */
    chartAPI('hled', {
        friendlyName: 'Horizontal LED Gauge',
        defaultPlotShadow: 1,
        standaloneInit: true,
        creditLabel: creditLabel,
        isHorizontal: true,
        rendererId: 'led',
        connectTickMarks: 1,
        realtimeEnabled: true
    }, chartAPI.vled);

    /* BULLET Charts */
    chartAPI('bullet', {
        creditLabel: creditLabel,
        defaultSeriesType: 'bullet',
        defaultPlotShadow: 1,
        drawAnnotations: true,
        realtimeEnabled: false,
        subTitleFontSizeExtender: 0,
        subTitleFontWeight: 0,
        connectTickMarks: 0,
        minorTMNumber: 0,
        majorTMHeight: 4,
        chartleftmargin: 10,
        chartrightmargin: 15,
        charttopmargin: 5,
        chartbottommargin: 5,
        isDataLabelBold: true,

        defaultPaletteOptions : extend(extend2({}, defaultGaugePaletteOptions), {
            //Store colors now
            paletteColors: [['A6A6A6', 'CCCCCC', 'E1E1E1', 'F0F0F0'],
                ['A7AA95', 'C4C6B7', 'DEDFD7', 'F2F2EE'],
                ['04C2E3','66E7FD','9CEFFE','CEF8FF'],
                ['FA9101', 'FEB654', 'FED7A0', 'FFEDD5'],
                ['FF2B60', 'FF6C92', 'FFB9CB', 'FFE8EE']],
            //Store other colors
            // ------------- For 2D Chart ---------------//
            //We're storing 5 combinations, as we've 5 defined palettes.
            bgColor: ['FFFFFF', 'CFD4BE,F3F5DD', 'C5DADD,EDFBFE', 'A86402,FDC16D', 'FF7CA0,FFD1DD'],
            bgAngle: [270, 270, 270, 270, 270],
            bgRatio: ['0,100', '0,100', '0,100', '0,100', '0,100'],
            bgAlpha: ['100', '60,50', '40,20', '20,10', '30,30'],

            toolTipBgColor: ['FFFFFF', 'FFFFFF', 'FFFFFF', 'FFFFFF', 'FFFFFF'],
            toolTipBorderColor: ['545454', '545454', '415D6F', '845001', '68001B'],

            baseFontColor: ['333333', '60634E', '025B6A', 'A15E01', '68001B'],
            tickColor: ['333333', '60634E', '025B6A', 'A15E01', '68001B'],
            trendColor: ['545454', '60634E', '415D6F', '845001', '68001B'],

            plotFillColor: ['545454', '60634E', '415D6F', '845001', '68001B'],

            borderColor: ['767575', '545454', '415D6F', '845001', '68001B'],
            borderAlpha: [50, 50, 50, 50, 50]

        }),

        preSeriesAddition: function () {
            var iapi = this,
                chartOptions = iapi.hcJSON.chart,
                chartAttrs = iapi.dataObj.chart;

            chartOptions.colorRangeBorderThickness = pluckNumber(chartAttrs.showgaugeborder,
                chartAttrs.showcolorrangeborder, 0) ? pluckNumber(chartAttrs.colorrangeborderthickness,
                chartAttrs.gaugeborderthickness, iapi.gaugeBorderThickness, 2) : 0;

        },

        postSeriesAddition: function (HCObj) {
            var iapi = this,
                def = iapi.dataObj,
                colorM = iapi.colorManager,
                serie = HCObj.series[0],
                chartDef = def.chart,
                showHoverEffect = pluckNumber(chartDef.showhovereffect),
                targetDef = {
                    value: def.target
                },
                targetThickness =  pluckNumber(chartDef.targetthickness, 3),
                borderColor = pluck(chartDef.targetcolor, colorM.getColor('plotFillColor')),
                borderAlpha = getValidValue(chartDef.targetalpha, 100),
                targetBorderColor = convertColor(borderColor, borderAlpha),
                targetFillPercent = pluckNumber(chartDef.targetfillpercent, 60),
                targetHoverColor,
                targetHoverAlpha,
                targetHoverThickness,
                hasTargetHoverMix,
                showHoverAnimation,
                hoverAttr,
                targetSerie,
                outAttr;

            if (showHoverEffect !== 0 && (showHoverEffect || chartDef.targethovercolor ||
                    chartDef.targethoveralpha || chartDef.targethoveralpha === 0 ||
                    chartDef.targethoverthickness || chartDef.targethoverthickness === 0)) {
                showHoverEffect = true;
                hoverAttr = {};
                outAttr = {};
                targetHoverThickness = pluckNumber(chartDef.targethoverthickness, targetThickness + 2);
                if (targetThickness !== targetHoverThickness) {
                    hoverAttr['stroke-width'] = targetHoverThickness;
                    outAttr['stroke-width'] = targetThickness;
                }
                targetHoverColor = pluck(chartDef.targethovercolor, FILLMIXDARK10);
                targetHoverAlpha = pluckNumber(chartDef.targethoveralpha, borderAlpha);
                if (targetHoverThickness) {
                    outAttr.stroke = targetBorderColor;
                    hasTargetHoverMix = /\{/.test(targetHoverColor);
                    hoverAttr.stroke = convertColor(hasTargetHoverMix ?
                        colorM.parseColorMix(borderColor, targetHoverColor)[0] :
                        targetHoverColor, targetHoverAlpha);
                }
                showHoverAnimation = !!pluckNumber(chartDef.showhoveranimation, 1);
            }

            // @note 1 denote target value
            targetSerie = iapi.getPointStub(targetDef, 1, HCObj, def);
            delete targetSerie.rolloverProperties;

            serie.data.push(extend2(targetSerie, {
                borderColor: targetBorderColor,
                borderWidth: targetThickness,
                targetThickness: targetThickness,
                targetFillPercent: targetFillPercent,
                rolloverProperties: {
                    enabled: showHoverEffect,
                    hoverAttr: hoverAttr,
                    outAttr: outAttr,
                    showHoverAnimation: showHoverAnimation
                }
            }));
        },

        getPointStub: function (dataObj, i, HCObj, FCObj, label) {
            // @note: i=1 denote target element
            var numberFormatter = this.numberFormatter,
            colorM = this.colorManager,
            HCConfig = HCObj[CONFIGKEY],
            itemValue = numberFormatter.getCleanValue(dataObj.value),
            dataLink = getValidValue(dataObj.link),
            setToolText = getValidValue(parseUnsafeString(i ?
                HCConfig.targettooltext : HCConfig.tooltext)),
            setDisplayValue = getValidValue(parseUnsafeString(dataObj.displayvalue)),
            formatedVal = numberFormatter.dataLabels(itemValue),
            colorCodeObj = this.colorRangeGetter.getColorObj(itemValue),
            FCChartObj = FCObj.chart,
            toolText, displayValue,
            formatedValue = i ? numberFormatter.dataLabels(numberFormatter.getCleanValue(FCObj.value)) : formatedVal,
            targetVal = i ? itemValue : numberFormatter.getCleanValue(FCObj.target),
            targetDataVal = i ? formatedVal :numberFormatter.dataLabels(targetVal),
            plotBorderColor, plotFillColor = pluck(FCChartObj.plotfillcolor, colorM.getColor('plotFillColor')),
            plotAsDot = pluckNumber(FCChartObj.plotasdot, 0),
            showHoverEffect = pluckNumber(FCChartObj.showhovereffect),
            showPlotBorder = pluckNumber(FCChartObj.showplotborder, 0),
            plotBorderThickness = showPlotBorder ? pluckNumber(FCChartObj.plotborderthickness, 1) : 0,
            plotFillPercent = pluckNumber(FCChartObj.plotfillpercent, plotAsDot ? 25 : 40),
            plotFillHoverColor,
            plotFillHoverAlpha,
            showPlotBorderOnHover,
            plotBorderHoverColor,
            plotBorderHoverThickness,
            plotBorderHoverAlpha,
            showHoverAnimation,
            hasBorderHoverMix,
            hasGaugeBorderMix,
            hoverAttr,
            fillColor,
            fillAlpha,
            plotBorderAlpha,
            plotBorder,
            outAttr;

            //create the tooltext
            if (!this.showTooltip) {
                toolText = BLANKSTRING;
            }
            else if (setToolText !== undefined) {
                toolText = parseTooltext(setToolText, [1,2,26,27], {
                    formattedValue: formatedValue,
                    targetValue: targetVal,
                    targetDataValue : targetDataVal
                }, FCObj, FCChartObj);
            }
            else {//determine the dispalay value then
                toolText = formatedVal === null ? false :
                (label !== undefined) ? label + this.tooltipSepChar + formatedVal : formatedVal;
            }
            //create the displayvalue
            if (!pluckNumber(dataObj.showvalue, this.showValues)) {
                displayValue = BLANKSTRING;
            }
            else if (setDisplayValue !== undefined) {
                displayValue = setDisplayValue;
            }
            else {//determine the dispalay value then
                displayValue = getValidValue(formatedVal, ' ');
            }
            if (this.pointValueWatcher) {
                this.pointValueWatcher(itemValue);
            }

            if (/\{/.test((plotBorderColor = pluck(FCChartObj.plotbordercolor,  '{dark-20}')))){
                hasGaugeBorderMix = true;
                plotBorderColor = colorM.parseColorMix(plotFillColor, plotBorderColor).join();
            }
            fillAlpha = pluckNumber(FCChartObj.plotfillalpha, 100);
            fillColor = convertColor(plotFillColor, fillAlpha);
            plotBorderAlpha = pluckNumber(FCChartObj.plotborderalpha, 100);
            plotBorder = convertColor(plotBorderColor, plotBorderAlpha);

            if (showHoverEffect !== 0 && (showHoverEffect || FCChartObj.plotfillhovercolor ||
                    FCChartObj.plotfillhoveralpha || FCChartObj.plotfillhoveralpha === 0 ||
                    FCChartObj.showplotborderonhover || FCChartObj.showplotborderonhover === 0 ||
                    FCChartObj.plotborderhovercolor || FCChartObj.plotborderhoverthickness ||
                    FCChartObj.plotborderhoverthickness === 0 || FCChartObj.plotborderhoveralpha ||
                    FCChartObj.plotborderhoveralpha === 0)) {
                showHoverEffect = true;
                hoverAttr = {};
                outAttr = {};
                plotFillHoverColor = pluck(FCChartObj.plotfillhovercolor, FILLMIXDARK10);
                plotFillHoverAlpha = pluckNumber(FCChartObj.plotfillhoveralpha, fillAlpha);
                plotFillHoverColor = /\{/.test(plotFillHoverColor) ? colorM.parseColorMix(plotFillColor,
                    plotFillHoverColor)[0] : plotFillHoverColor;
                hoverAttr.fill = convertColor(plotFillHoverColor, plotFillHoverAlpha);
                outAttr.fill = fillColor;
                showPlotBorderOnHover = pluckNumber(FCChartObj.showplotborderonhover);
                if(showPlotBorderOnHover === undefined){
                    if (FCChartObj.plotborderhoverthickness || FCChartObj.plotborderhovercolor ||
                            FCChartObj.plotborderhoveralpha){
                        showPlotBorderOnHover = 1;
                    }
                    else {
                        showPlotBorderOnHover = showPlotBorder;
                    }
                }
                plotBorderHoverThickness = showPlotBorderOnHover ?
                    pluckNumber(FCChartObj.plotborderhoverthickness, plotBorderThickness || 1) : 0;
                if (plotBorderThickness !== plotBorderHoverThickness) {
                    hoverAttr['stroke-width'] = plotBorderHoverThickness;
                    outAttr['stroke-width'] = plotBorderThickness;
                }
                plotBorderHoverColor = pluck(FCChartObj.plotborderhovercolor, FILLMIXDARK10);
                plotBorderHoverAlpha = pluckNumber(FCChartObj.plotborderhoveralpha, plotBorderAlpha);
                if (plotBorderHoverThickness) {
                    outAttr.stroke = plotBorder;
                    hasBorderHoverMix = /\{/.test(plotBorderHoverColor);
                    hoverAttr.stroke = convertColor(hasBorderHoverMix ? colorM.parseColorMix(hasGaugeBorderMix ?
                        plotFillHoverColor : plotBorderColor, plotBorderHoverColor)[0] :
                        plotBorderHoverColor, plotBorderHoverAlpha);
                }
                showHoverAnimation = !!pluckNumber(FCChartObj.showhoveranimation, 1);
            }

            return {
                y: itemValue,
                displayValue : displayValue,
                toolText : toolText,
                plotAsDot: plotAsDot,
                plotFillPercent: plotFillPercent,
                color: fillColor,
                borderColor: plotBorder,
                borderWidth: plotBorderThickness,
                link: dataLink,
                colorRange: colorCodeObj,
                doNotSlice: true,
                rolloverProperties: {
                    enabled: showHoverEffect,
                    hoverAttr: hoverAttr,
                    outAttr: outAttr,
                    showHoverAnimation: showHoverAnimation
                }
            };
        }
    }, chartAPI.linearscalegauge);

    /* VBULLET Charts */
    chartAPI('vbullet', {
        friendlyName: 'Vertical Bullet Gauge',
        creditLabel: creditLabel,
        defaultSeriesType: 'bullet',
        gaugeType: 4,
        ticksOnRight: 0,
        rendererId: 'bullet',
        standaloneInit: true
    }, chartAPI.bullet);

    /* HBULLET Charts */
    chartAPI('hbullet', {
        friendlyName: 'Horizontal Bullet Gauge',
        creditLabel: creditLabel,
        defaultSeriesType: 'hbullet',
        gaugeType: 1,
        standaloneInit: true,
        isHorizontal: true,
        defaultCaptionPadding : 5,
        rendererId: 'hbullet',
        //can place one dataLabels at Right
        placeDataLabels: function(hcJSON, minCanW) {
            var smartLabel = this.smartLabel,
            HCChartObj = hcJSON.chart,
            //labelStyle = series.dataLabels.style,
            canvasWidth = this.width - (HCChartObj.marginRight + HCChartObj.marginLeft),
            canvasHeight =  this.height - (HCChartObj.marginTop + HCChartObj.marginBottom),
            smartDataLabel,
            dataLabels = hcJSON.plotOptions.series.dataLabels,
            style = dataLabels.style,
            fontSize = pluckNumber(parseInt(style.fontSize, 10), 10),
            maxAllowedWidth = canvasWidth - minCanW,
            valuePadding = HCChartObj.valuePadding,
            widthUsed = 0,
            point = hcJSON.series[0].data[0],
            ExtraSpace;
            if (point && point.displayValue !== BLANKSTRING) {
                smartLabel.setStyle(style);
                if (point.isLabelString) {
                    smartDataLabel = smartLabel.getSmartText(point.displayValue, maxAllowedWidth - valuePadding,
                        canvasHeight);
                    point.displayValue = smartDataLabel.text;
                    smartDataLabel.tooltext && (point.originalText = smartDataLabel.tooltext);
                }
                else {
                    smartDataLabel = smartLabel.getOriSize(point.displayValue);
                }

                if (smartDataLabel.height > 0) {
                    widthUsed = smartDataLabel.width + valuePadding;
                }

                if (widthUsed > maxAllowedWidth) {
                    ExtraSpace = widthUsed - maxAllowedWidth;
                    valuePadding = ExtraSpace < valuePadding ? valuePadding - ExtraSpace : 0;
                    widthUsed = maxAllowedWidth;
                }
                HCChartObj.marginRight += widthUsed;
                dataLabels.align = POSITION_LEFT;
                dataLabels.x = 0;
                dataLabels.y = fontSize - (smartDataLabel.height / 2);
            // This aligh the displayValue on right of the chart
            // When captionOnRight is given for HBullet chart
            // HCChartObj.valuePadding = chartRight - chartRightSpace + valuePadding;
            }
            return widthUsed;
        },
        //manage space for title and subtitle at top
        manageTitleSpace : function (hcJSON, fcJSON, minCanvasWidth) {
            var HCChartObj = hcJSON.chart,
            FCChartObj = fcJSON.chart,
            canvasWidth = this.width - (HCChartObj.marginRight + HCChartObj.marginLeft),
            canvasHeight = this.height - (HCChartObj.marginTop + HCChartObj.marginBottom),
            captionPadding = pluckNumber(FCChartObj.captionpadding, 2),
            //return titleSpaceManager(hcJSON, fcJSON, canvasWidth,  canvasHeight - minCanvasHeight);
            // IF canvasMargins are given for Bullet Graph
            // We use the sapce in canvasMargin to draw the caption.
            canvasMargin = pluckNumber(pluckNumber(FCChartObj.captiononright, 0) ?
                FCChartObj.canvasrightmargin : FCChartObj.canvasleftmargin),
            maxCaptionWidth;
            if (defined(canvasMargin)) {
                canvasMargin -= captionPadding;
            }
            maxCaptionWidth = pluckNumber(canvasMargin, canvasWidth - minCanvasWidth);

            return placeTitleOnSide(hcJSON, fcJSON, maxCaptionWidth, canvasHeight,
                this.defaultCaptionPadding, this.width, this.height, this);

        },

        fixCaptionAlignment: function (captionWidth, hcJSON, fcJSON, width, leftLabel, rightLabel) {
            var HCChartObj = hcJSON.chart,
                FCChartObj = fcJSON.chart,
                canvasLeftMargin = pluckNumber(FCChartObj.canvasleftmargin),
                canvasRightMargin = pluckNumber(FCChartObj.canvasrightmargin),
                captionPadding = 0,
                iapi = this;

            HCChartObj.marginRight += captionWidth.right;
            HCChartObj.marginLeft += captionWidth.left;

            //Before doing so, we take into consideration, user's forced canvas margins (if any defined)
            if (defined(canvasLeftMargin)) {
                HCChartObj.spacingLeft = HCChartObj.marginLeft = canvasLeftMargin;
                HCChartObj.spacingLeft -= (captionWidth.left + captionPadding - 1);
            }
            if (defined(canvasRightMargin)) {
                HCChartObj.spacingRight = HCChartObj.marginRight = canvasRightMargin;
                HCChartObj.spacingRight -= (captionWidth.right + captionPadding - 1);
            }

            fixCaptionAlignment(hcJSON, fcJSON, this.width, leftLabel, rightLabel, iapi);

        }

    }, chartAPI.bullet);

    /* Linear Gauge */
    chartAPI('lineargauge', {
        creditLabel: creditLabel,
        defaultSeriesType: 'lineargauge',
        multiValueGauge: true,
        realtimeEnabled: true,
        gaugeType: 1,
        chartleftmargin: 15,
        chartrightmargin: 15,
        charttopmargin: 10,
        chartbottommargin: 10,
        colorRangeFillMix: '{light-10},{dark-20},{light-50},{light-85}',
        colorRangeFillRatio: '0,8,84,8',
        isDataLabelBold: true,
        eiMethods: extend2(extend2({}, chartAPI.gaugebase.eiMethods), {
            getData: function (index) {
                var traverse, len, dataObj,
                data = (traverse = this.jsVars) && (traverse = traverse.hcObj) &&
                (traverse = traverse.options) && (traverse = traverse.series) &&
                (traverse = traverse[0]) && (traverse = traverse.data);

                if (!data || !data.length) {
                    len = 0;
                } else {
                    len = data.length;
                }

                if (index !== undefined && index > 0 && index <= len) {
                    dataObj = data[index - 1];
                    return pluckNumber(dataObj.value, dataObj.y);
                } else {
                    return null;
                }

            },
            getDataForId: function (id) {
                var traverse, dataObj,
                dataById = (traverse = this.jsVars) && (traverse = traverse.hcObj) &&
                    (traverse = traverse.dataById);

                if (dataById[id] && dataById[id].point) {
                    dataObj = dataById[id].point;
                    return pluckNumber(dataObj.value, dataObj.y);
                } else {
                    return null;
                }

            },
            setData: function (index, value, label) {
                var iapi = this,
                stream = '',
                nullPadding = '',
                traverse,
                data = (traverse = iapi.jsVars) && (traverse = traverse.hcObj) &&
                    (traverse = traverse.options) && (traverse = traverse.series) &&
                    (traverse = traverse[0]) && (traverse = traverse.data),
                l =  data && data.length || 0,
                i = 0;

                if (index > 0 && index <= l && ((value && value.toString()) ||
                    value === '' || value === 0)) {
                    i = index;
                    while (--i) {
                        nullPadding += '|';
                    }

                    stream += 'value=' + (nullPadding + value);

                    if ((label && label.toString) || label === '') {
                        stream += ('&label=' + nullPadding + label.toString());
                    }

                    iapi.feedData(stream);
                }
            },
            setDataForId: function (id, value, label) {
                var traverse,
                dataById = (traverse = this.jsVars) && (traverse = traverse.hcObj) &&
                    (traverse = traverse.dataById);

                if (dataById[id] && (dataById[id].index !== undefined)) {
                    this.setData((dataById[id].index + 1), value, label);
                }
            }
        }),
        placeDataLabels: function(hcJSON, minCanW, minCanH, chartTopSpace, chartRightSpace, chartBottomSpace,
             chartLeftSpace, tickDimension) {
            var api = this,
            //options = api.options,
            scaleObj = hcJSON.scale,
            smartLabel = api.smartLabel,
            HCChartObj = hcJSON.chart,
            //labelStyle = series.dataLabels.style,
            canvasWidth = api.width - (HCChartObj.marginRight + HCChartObj.marginLeft),
            canvasHeight =  api.height - (HCChartObj.marginTop + HCChartObj.marginBottom),
            smartDataLabel, extraSpace,
            dataLabels = hcJSON.plotOptions.series.dataLabels,
            style = dataLabels.style,
            trendStyle = hcJSON.scale && hcJSON.scale.labels && hcJSON.scale.labels.style,
            lineHeight = pluckNumber(parseInt(style.lineHeight, 10), 12),
            maxAllowedHeight = canvasHeight - minCanH,
            maxAllowedWidth = canvasWidth - minCanW,
            valuePadding = HCChartObj.valuePadding,
            valuePaddingWithRadius,
            heightUsed = 0, heightUsedBottom = 0, heightUsedTop = 0,
            heightReducedBottom = 0, heightReducedTop = 0,
            widthUsed = 0,
            data = (hcJSON.series && hcJSON.series[0] && hcJSON.series[0].data) || [],
            trendPoints = (hcJSON.scale && hcJSON.scale.trendPoint) || [],
            i = 0, len = data.length, point;

            smartLabel.setStyle(style);
            for (; i < len; i += 1) {
                point = data[i];
                if (point && point.displayValue !== BLANKSTRING) {

                    // Add pointer radius in value-padding
                    valuePaddingWithRadius = valuePadding + point.radius *
                    (point.sides <= 3 ? 0.5 : (point.sides % 2 ? 1.1 - (1 / point.sides) : 1));

                    HCChartObj.valuePadding = Math.max(HCChartObj.valuePadding, valuePaddingWithRadius);

                    if (api.isHorizontal) {
                        if (point.isLabelString) {
                            smartDataLabel = smartLabel.getSmartText(point.displayValue, canvasWidth,
                                maxAllowedHeight - valuePadding);
                            point.displayValue = smartDataLabel.text;
                            smartDataLabel.tooltext && (point.originalText = smartDataLabel.tooltext);
                        }
                        else {
                            smartDataLabel = smartLabel.getOriSize(point.displayValue);
                        }
                        //special fix for space string
                        /** @todo will be removed when smartLabel will be able to handle it */
                        if (point.displayValue === ' ') {
                            smartDataLabel = {
                                height : lineHeight
                            };
                        }

                        if (smartDataLabel.height > 0) {
                            heightUsed = smartDataLabel.height + valuePaddingWithRadius;
                        }
                        if (heightUsed > maxAllowedHeight) {
                            extraSpace = heightUsed - maxAllowedHeight;
                            valuePaddingWithRadius = extraSpace < valuePaddingWithRadius ?
                                valuePaddingWithRadius - extraSpace : 0;
                            heightUsed = maxAllowedHeight;
                        }
                        if (HCChartObj.pointerOnOpp) {
                            if (scaleObj.axisPosition === AXISPOSITION_BOTTOM) {
                                heightReducedBottom = Math.max(tickDimension, heightReducedBottom);
                                heightUsed = Math.max(tickDimension, heightUsed);
                            }

                            heightUsedBottom = Math.max(heightUsedBottom, heightUsed);
                        } else {
                            if (scaleObj.axisPosition === AXISPOSITION_TOP) {
                                heightReducedTop = Math.max(tickDimension, heightReducedTop);
                                heightUsed = Math.max(tickDimension, heightUsed);
                            }

                            heightUsedTop = Math.max(heightUsed, heightUsedTop);
                        }
                        dataLabels.align = POSITION_CENTER;
                    //HCChartObj.valuePadding = chartBottom - chartBottomSpace + fontSize + valuePadding;

                    } else {

                        /** @todo need to implement the label space management of  */
                        // vertical gauge properly including trendLabels as well.
                        // Refer to the isHorizontal section.
                        if (point.isLabelString) {
                            smartDataLabel = smartLabel.getSmartText(point.displayValue,
                                maxAllowedWidth - valuePadding, canvasHeight);
                            point.displayValue = smartDataLabel.text;
                            smartDataLabel.tooltext && (point.originalText = smartDataLabel.tooltext);
                        }
                        else {
                            smartDataLabel = smartLabel.getOriSize(point.displayValue);
                        }

                        if (smartDataLabel.width > 0) {
                            widthUsed = smartDataLabel.width + valuePaddingWithRadius;
                        }

                        if (widthUsed > maxAllowedWidth) {
                            extraSpace = widthUsed - maxAllowedWidth;
                            valuePaddingWithRadius = extraSpace < valuePaddingWithRadius ?
                                valuePaddingWithRadius - extraSpace : 0;
                            widthUsed = maxAllowedWidth;
                        }

                        if (HCChartObj.pointerOnOpp) {
                            if (scaleObj.axisPosition === AXISPOSITION_RIGHT) {
                                HCChartObj.marginRight -= tickDimension;
                                HCChartObj.marginRight += Math.max(tickDimension, widthUsed);
                            } else {
                                HCChartObj.marginRight += widthUsed;
                            }
                        } else {
                            if (scaleObj.axisPosition === AXISPOSITION_LEFT) {
                                HCChartObj.marginLeft -= tickDimension;
                                HCChartObj.marginLeft += Math.max(tickDimension, widthUsed);
                            } else {
                                HCChartObj.marginLeft += widthUsed;
                            }
                        }

                        dataLabels.align = POSITION_CENTER;
                    //HCChartObj.valuePadding = chartBottom - chartBottomSpace + fontSize + valuePadding;
                    }
                }
            }

            smartLabel.setStyle(trendStyle);
            for (i = 0, len = trendPoints.length; i < len; i += 1) {
                point = trendPoints[i];
                if (point && point.displayValue !== BLANKSTRING) {

                    // Add pointer radius in value-padding
                    valuePaddingWithRadius = valuePadding + point.markerRadius * 0.5; // it will always have three sides

                    HCChartObj.valuePadding = Math.max(valuePaddingWithRadius, HCChartObj.valuePadding);
                    if (api.isHorizontal) {
                        smartDataLabel = smartLabel.getOriSize(point.displayValue);

                        if (smartDataLabel.height > 0) {
                            heightUsed = smartDataLabel.height + valuePaddingWithRadius;
                        }
                        if (heightUsed > maxAllowedHeight) {
                            extraSpace = heightUsed - maxAllowedHeight;
                            valuePaddingWithRadius = extraSpace < valuePaddingWithRadius ?
                                valuePaddingWithRadius - extraSpace : 0;
                            heightUsed = maxAllowedHeight;
                        }
                        if (point.showOnTop) {
                            if (scaleObj.axisPosition === AXISPOSITION_TOP) {
                                heightReducedTop = Math.max(tickDimension, heightReducedTop);
                                heightUsed = Math.max(tickDimension, heightUsed);
                            }

                            heightUsedTop = Math.max(heightUsedTop, heightUsed);
                        } else {
                            if (scaleObj.axisPosition === AXISPOSITION_BOTTOM) {
                                heightReducedBottom = Math.max(tickDimension, heightReducedBottom);
                                heightUsed = Math.max(tickDimension, heightUsed);
                            }

                            heightUsedBottom = Math.max(heightUsed, heightUsedBottom);
                        }
                        dataLabels.align = POSITION_CENTER;
                    //HCChartObj.valuePadding = chartBottom - chartBottomSpace + fontSize + valuePadding;

                    }
                }
            }

            if (api.isHorizontal) {
                HCChartObj.marginBottom += (heightUsedBottom - heightReducedBottom);
                HCChartObj.marginTop += (heightUsedTop - heightReducedTop);
                heightUsed = heightUsedTop + heightUsedBottom - heightReducedBottom - heightReducedTop;
            }

            return heightUsed;
        },
        preSeriesAddition: function (HCObj, FCObj) {
            var HCChartObj = HCObj.chart,
            FCChartObj = FCObj.chart,
            colorM = this.colorManager,
            scale = HCObj.scale;
            //Pointer properties
            HCChartObj.pointerRadius = pluckNumber(FCChartObj.pointerradius, 10),
            HCChartObj.pointerBgColor = pluck(FCChartObj.pointerbgcolor, FCChartObj.pointercolor,
                colorM.getColor('pointerBgColor')),
            HCChartObj.pointerBgAlpha = pluckNumber(FCChartObj.pointerbgalpha, 100),
            HCChartObj.pointerBorderColor = pluck(FCChartObj.pointerbordercolor, colorM.getColor('pointerBorderColor')),
            HCChartObj.pointerBorderThickness = pluckNumber(FCChartObj.pointerborderthickness, 1),
            HCChartObj.pointerBorderAlpha = pluckNumber(FCChartObj.pointerborderalpha, 100),
            HCChartObj.pointerSides = pluckNumber(FCChartObj.pointersides, 3);
            HCChartObj.showGaugeLabels = pluckNumber(FCChartObj.showgaugelabels, 1);
            HCChartObj.showPointerShadow = pluckNumber(FCChartObj.showpointershadow, FCChartObj.showshadow, 1);
            HCChartObj.valuePadding = pluckNumber(FCChartObj.valuepadding, 2);

            if (this.isHorizontal) {
                HCChartObj.pointerOnOpp = pluckNumber(FCChartObj.pointerontop,
                    (scale.axisPosition == AXISPOSITION_TOP ? 0 : 1)) ? 0 : 1;
                HCChartObj.gaugeType = scale.reverseScale ? GAUGETYPE_HORIZONTAL_REVERSED : GAUGETYPE_HORIZONTAL;
                HCChartObj.valueAbovePointer = pluckNumber(FCChartObj.valueabovepointer, HCChartObj.pointerOnOpp ?
                    0 : 1, 1);
                if (HCChartObj.valueAbovePointer === HCChartObj.pointerOnOpp) {
                    HCChartObj.valueInsideGauge = 1;
                } else {
                    HCChartObj.valueInsideGauge = 0;
                }
            } else {
                HCChartObj.pointerOnOpp = pluckNumber(FCChartObj.pointeronright,
                    (scale.axisPosition == AXISPOSITION_RIGHT ? 0 : 1));
                HCChartObj.gaugeType = scale.reverseScale ? GAUGETYPE_VERTICAL_REVERSED : GAUGETYPE_VERTICAL;
            }
        },

        getPointStub: function (dataObj, i, HCObj, FCObj, label) {
            var numberFormatter = this.numberFormatter,
            colorM = this.colorManager,
            HCChartObj = HCObj.chart,
            HCConfig = HCObj[CONFIGKEY],
            itemValue = numberFormatter.getCleanValue(dataObj.value),
            dataLink = getValidValue(dataObj.link),
            setToolText = getValidValue(parseUnsafeString(pluck(dataObj.tooltext, HCConfig.tooltext))),
            setDisplayValue = getValidValue(parseUnsafeString(dataObj.displayvalue)),
            formatedVal = numberFormatter.dataLabels(itemValue),
            colorCodeObj = this.colorRangeGetter.getColorObj(itemValue),
            FCChartObj = FCObj.chart,
            bgAlpha =  pluckNumber(dataObj.alpha, dataObj.bgalpha, HCChartObj.pointerBgAlpha),
            bgColor =  pluck(dataObj.color, dataObj.bgcolor, HCChartObj.pointerBgColor),
            fillColor = convertColor(bgColor, bgAlpha),
            showBorder = pluckNumber(dataObj.showborder, FCChartObj.showplotborder, 1),
            borderAlpha = pluckNumber(dataObj.borderalpha, HCChartObj.pointerBorderAlpha),
            borderColor = pluck(dataObj.bordercolor, HCChartObj.pointerBorderColor),
            pointerBorderColor = convertColor(borderColor, borderAlpha),
            borderWidth = showBorder ? pluckNumber(dataObj.borderthickness, HCChartObj.pointerBorderThickness) : 0,
            radius = pluckNumber(dataObj.radius, HCChartObj.pointerRadius),
            showHoverEffect = pluckNumber(dataObj.showhovereffect, FCChartObj.showhovereffect),
            showBorderOnHover,
            toolText,
            displayValue,
            sides,
            pointerHoverRadius,
            pointerBgHoverColor,
            pointerBgHoverAlpha,
            pointerBorderHoverThickness,
            pointerBorderHoverColor,
            pointerBorderHoverAlpha,
            showHoverAnimation,
            hasHoberFillMix,
            hasBorderHoverMix,
            isLabelString = false,
            isTooltextString = false,
            hoverAnimAttr,
            hoverAttr,
            outAttr,
            outAnimAttr;

            //create the tooltext
            if (!this.showTooltip) {
                toolText = BLANKSTRING;
            }
            else if (setToolText !== undefined) {
                toolText = parseTooltext(setToolText, [1,2], {
                    formattedValue: formatedVal
                }, dataObj, FCChartObj);
                isTooltextString = true;
            }
            else {//determine the dispalay value then
                toolText = formatedVal === null ? false :
                (label !== undefined) ? label + this.tooltipSepChar + formatedVal : formatedVal;
            }
            //create the displayvalue
            if (!pluckNumber(dataObj.showvalue, this.showValues)) {
                displayValue = BLANKSTRING;
            }
            else if (setDisplayValue !== undefined) {
                displayValue = setDisplayValue;
                isLabelString = true;
            }
            else {//determine the dispalay value then
                displayValue = getValidValue(formatedVal, ' ');
            }
            sides = pluckNumber(dataObj.sides, HCChartObj.pointerSides);
            if (sides < 3) {
                sides = 3;
            }

            if (this.pointValueWatcher) {
                this.pointValueWatcher(itemValue);
            }
            // @Todo: parse chart level hover attribute at a common place.
            if (showHoverEffect !== 0 && (showHoverEffect || dataObj.bghovercolor ||
                    FCChartObj.pointerbghovercolor || FCChartObj.plotfillhovercolor ||
                    dataObj.bghoveralpha || FCChartObj.pointerbghoveralpha || FCChartObj.plotfillhoveralpha ||
                    dataObj.bghoveralpha === 0 || FCChartObj.pointerbghoveralpha === 0 ||
                    dataObj.showborderonhover || FCChartObj.showborderonhover ||
                    dataObj.showborderonhover === 0 || FCChartObj.showborderonhover === 0 ||
                    dataObj.borderhoverthickness || FCChartObj.pointerborderhoverthickness ||
                    dataObj.borderhoverthickness === 0 || FCChartObj.pointerborderhoverthickness === 0 ||
                    dataObj.borderhovercolor || FCChartObj.pointerborderhovercolor ||
                    dataObj.borderhoveralpha || FCChartObj.pointerborderhoveralpha ||
                    dataObj.borderhoveralpha === 0 || FCChartObj.pointerborderhoveralpha === 0 ||
                    dataObj.hoverradius || FCChartObj.pointerhoverradius || dataObj.hoverradius === 0 ||
                    FCChartObj.pointerhoverradius === 0)) {
                showHoverEffect = true;
                pointerBgHoverColor = pluck(dataObj.bghovercolor, FCChartObj.pointerbghovercolor,
                    FCChartObj.plotfillhovercolor, FILLMIXDARK10);
                pointerBgHoverAlpha = pluckNumber(dataObj.bghoveralpha,
                    FCChartObj.pointerbghoveralpha, FCChartObj.plotfillhoveralpha);
                showBorderOnHover = pluckNumber(dataObj.showborderonhover, FCChartObj.showborderonhover);
                if (showBorderOnHover === undefined){
                    if (dataObj.borderhoverthickness || dataObj.borderhoverthickness === 0 ||
                            dataObj.borderhovercolor || dataObj.borderhoveralpha ||
                            dataObj.borderhoveralpha === 0){
                        showBorderOnHover = 1;
                    }
                    else {
                        showBorderOnHover = showBorder;
                    }
                }
                pointerBorderHoverColor = pluck(dataObj.borderhovercolor, FCChartObj.pointerborderhovercolor,
                    FILLMIXDARK10);
                pointerBorderHoverAlpha = pluckNumber(dataObj.borderhoveralpha, FCChartObj.pointerborderhoveralpha);
                pointerBorderHoverThickness = showBorderOnHover ? pluckNumber(dataObj.borderhoverthickness,
                    FCChartObj.pointerborderhoverthickness, borderWidth || 1) : 0;
                pointerHoverRadius = pluckNumber(dataObj.hoverradius, FCChartObj.pointerhoverradius, radius + 2);
                showHoverAnimation = !!pluckNumber(dataObj.showhoveranimation, FCChartObj.showhoveranimation, 1);
                hoverAttr = {};
                outAttr = {};
                if (borderWidth !== pointerBorderHoverThickness) {
                    hoverAttr['stroke-width'] = pointerBorderHoverThickness;
                    outAttr['stroke-width'] = borderWidth;
                }
                outAttr.fill = fillColor;
                hasHoberFillMix = /\{/.test(pointerBgHoverColor);
                pointerBgHoverColor = hasHoberFillMix ? colorM.parseColorMix(bgColor,
                    pointerBgHoverColor)[0] : pointerBgHoverColor;
                hoverAttr.fill = convertColor(pointerBgHoverColor, pluckNumber(pointerBgHoverAlpha, bgAlpha));
                if (pointerBorderHoverThickness) {
                    outAttr.stroke = pointerBorderColor;
                    hasBorderHoverMix = /\{/.test(pointerBorderHoverColor);
                    hoverAttr.stroke = convertColor(hasBorderHoverMix ? colorM.parseColorMix(borderColor,
                        pointerBorderHoverColor)[0] : pointerBorderHoverColor,
                        pluckNumber(pointerBorderHoverAlpha, borderAlpha));
                }

                if (pointerHoverRadius){
                    if (showHoverAnimation) {
                        hoverAnimAttr = {
                            r: pointerHoverRadius
                        };
                        outAnimAttr = {
                            r: radius
                        };
                    }
                    else {
                        hoverAttr.r = pointerHoverRadius;
                        outAttr.r = radius;
                    }
                }
            }


            return {
                y: itemValue,
                displayValue : displayValue,
                id: pluck(dataObj.id, 'pointer_' + i),
                editMode: pluckNumber(dataObj.editmode, FCChartObj.editmode),
                isLabelString: isLabelString,
                isTooltextString: isTooltextString,
                toolText: toolText,
                _tooltext: dataObj.tooltext,
                plotFillPercent: pluck(FCChartObj.plotfillpercent, 40),
                bgalpha: bgAlpha,
                color: fillColor,
                borderAlpha: (pluckNumber(FCChartObj.showplotborder, 1) ? HCChartObj.pointerBorderAlpha : 0),
                borderColor: pointerBorderColor,
                borderWidth: borderWidth,
                radius: radius,
                sides: sides,
                link: dataLink,
                colorRange: colorCodeObj,
                doNotSlice: true,
                tooltipConstraint: this.tooltipConstraint,
                rolloverProperties: {
                    enabled: showHoverEffect,
                    hoverAttr: hoverAttr,
                    hoverAnimAttr: hoverAnimAttr,
                    outAttr: outAttr,
                    outAnimAttr: outAnimAttr
                }
            };
        }
    }, chartAPI.linearscalegauge);

    // HLinearGauge //
    chartAPI('hlineargauge', {
        friendlyName: 'Horizontal Linear Gauge',
        creditLabel: creditLabel,
        defaultSeriesType: 'lineargauge',
        rendererId: 'hlinear',
        standaloneInit: true,
        isHorizontal: true
    }, chartAPI.lineargauge);

    // VLinearGauge //
    chartAPI('vlineargauge', {
        friendlyName: 'Vertical Linear Gauge',
        creditLabel: creditLabel,
        defaultSeriesType: 'lineargauge',
        connectTickMarks: 0,
        standaloneInit: true
    }, chartAPI.lineargauge);

    // VLinearGauge //
    chartAPI('thermometer', {
        friendlyName: 'Thermometer Gauge',
        creditLabel: creditLabel,
        defaultSeriesType: 'thermometer',
        rendererId: 'thermometer',
        connectTickMarks: 0,
        tickMarkDistance: 0,
        standaloneInit: true,
        realtimeEnabled: true,
        isDataLabelBold: true,
        defaultPlotShadow : 0,
        alignCaptionWithCanvas: 0,

        defaultPaletteOptions : extend(extend2({}, defaultGaugePaletteOptions), {
            thmBorderColor: ['545454', '60634E', '415D6F', '845001', '68001B'],
            thmFillColor: ['999999', 'ADB68F', 'A2C4C8', 'FDB548', 'FF7CA0']
        }),

        preSeriesAddition: function (HCObj, FCObj) {
            var HCChartObj = HCObj.chart,
            FCChartObj = FCObj.chart,
            colorM = this.colorManager,
            gaugeBorderAlpha,
            numberFormatter = this.numberFormatter,
            showHoverEffect = pluckNumber(FCChartObj.showhovereffect),
            thmFillHoverColor;


            //-------------------------- Gauge specific properties --------------------------//
            HCChartObj.thmOriginX = pluckNumber(FCChartObj.thmoriginx, FCChartObj.gaugeoriginx);
            HCChartObj.thmOriginY = pluckNumber(FCChartObj.thmoriginy, FCChartObj.gaugeoriginy);
            HCChartObj.thmBulbRadius = pluckNumber(numberFormatter.getCleanValue(FCChartObj.thmbulbradius, true));
            HCChartObj.thmHeight = pluckNumber(numberFormatter.getCleanValue(pluckNumber(FCChartObj.thmheight,
                FCChartObj.gaugeheight), true));

            //Special for LED
            //Gauge fill color & alpha
            HCChartObj.gaugeFillColor = pluck(FCChartObj.gaugefillcolor, FCChartObj.thmfillcolor,
                colorM.getColor('thmFillColor'));
            HCChartObj.gaugeFillAlpha = pluckNumber(FCChartObj.gaugefillalpha, FCChartObj.thmfillalpha, HUNDREDSTRING);

            //parse hove attributes
            if (showHoverEffect !== 0 && (showHoverEffect || FCChartObj.thmfillhovercolor ||
                    FCChartObj.plotfillhovercolor || FCChartObj.thmfillhoveralpha ||
                    FCChartObj.plotfillhoveralpha || FCChartObj.thmfillhoveralpha === 0)) {
                showHoverEffect = true;
                HCChartObj.plotHoverEffects = {};

                HCChartObj.plotHoverEffects.enabled = showHoverEffect;
                thmFillHoverColor = pluck(FCChartObj.thmfillhovercolor, FCChartObj.plotfillhovercolor, FILLMIXDARK10);
                HCChartObj.plotHoverEffects.thmFillHoverColor = /\{/.test(thmFillHoverColor) ?
                    colorM.parseColorMix(HCChartObj.gaugeFillColor, thmFillHoverColor)[0] : thmFillHoverColor;
                HCChartObj.plotHoverEffects.thmFillHoverAlpha = pluck(FCChartObj.thmfillhoveralpha,
                    FCChartObj.plotfillhoveralpha, HCChartObj.gaugeFillAlpha);
            }

            //Gauge Border properties
            gaugeBorderAlpha = pluckNumber(FCChartObj.gaugeborderalpha,
                pluckNumber(FCChartObj.showgaugeborder, 1) ? 40 : 0);
            // We are using 40 for default alpha of Thermometer Gauge Border
            HCChartObj.gaugeBorderColor = convertColor(pluck(FCChartObj.gaugebordercolor,
                colorM.getColor('thmBorderColor')),
                gaugeBorderAlpha);
            HCChartObj.gaugeBorderThickness = pluckNumber(FCChartObj.gaugeborderthickness, 1);

            // Thermometer Glass color
            HCChartObj.thmGlassColor = pluck(FCChartObj.thmglasscolor, getLightColor(HCChartObj.gaugeFillColor, 30));

            // Whether to use 3D lighting effect for thermometer gauge or not
            HCChartObj.use3DLighting = !pluckNumber(FCChartObj.use3dlighting, 1);

        },
        //retuen the point color as an object
        getPointColorObj: function (FCChartObj) {
            return {
                code: pluck(FCChartObj.gaugefillcolor, FCChartObj.thmfillcolor,
                    this.colorManager.getColor('thmFillColor')),
                alpha: pluckNumber(FCChartObj.gaugefillalpha, FCChartObj.thmfillalpha, 100)
            };
        },

        getPointStub: chartAPI.linearscalegauge,

        //can place one dataLabels at bottom
        placeDataLabels: chartAPI.linearscalegauge,

        //manage space for title and subtitle at top
        manageTitleSpace: chartAPI.linearscalegauge,

        /** @todo fix the spacemanagement issue for vertical axis with long limit labels. */
        spaceManager: function (hcJSON, fcJSON, width, height) {
            var HCChartObj = hcJSON.chart,
            //labelStyle = series.dataLabels.style,
            canvasWidth = width - (HCChartObj.marginRight + HCChartObj.marginLeft),
            canvasHeight =  height - (HCChartObj.marginTop + HCChartObj.marginBottom),
            chartRight = HCChartObj.marginRight,
            chartLeft = HCChartObj.marginLeft,
            chartTop = HCChartObj.marginTop,
            chartBottom = HCChartObj.marginBottom,
            minCanW = canvasWidth * 0.3,
            minCanH = canvasHeight * 0.3,
            thmOriginX = HCChartObj.thmOriginX,
            thmOriginY = HCChartObj.thmOriginY,
            thmBulbRadius = HCChartObj.thmBulbRadius,
            thmHeight = HCChartObj.thmHeight,
            xDefined = defined(thmOriginX),
            yDefined = defined(thmOriginY),
            rDefined = defined(thmBulbRadius),
            hDefined = defined(thmHeight),
            cos50 = 0.643,
            sin50 = 0.766,
            scale = hcJSON.scale,
            isOnLeft = scale.axisPosition === 4,
            scaleWidth = 0,
            marginDewToX = 0,
            // Thermometer minimum radius it can't be less than 4px
            thmMinRadius = 4,
            thmWidth, bulbHeight, thmhalfWidth, titleHeight = 0;

            // Manage title Space
            if (!hcJSON.title.alignWithCanvas) {
                canvasHeight -= titleHeight = this.manageTitleSpace(hcJSON, fcJSON, 0, canvasHeight / 2);
            }

            //manage scaleSpace
            if (this.placeTickMark) {
                //canvasWidth -= scaleWidth = this.placeTickMark(hcJSON, pluckNumber(canvasWidth - (thmBulbRadius * 2),
                // canvasWidth * 0.3), minCanH);
                canvasWidth -= scaleWidth = this.placeTickMark(hcJSON,
                    pluckNumber(thmBulbRadius, thmMinRadius) * 2, minCanH);
            }

            //if Not defined the radius then calculate it.
            if (!rDefined) {
                HCChartObj.thmBulbRadius = thmBulbRadius =  Math.min(canvasWidth / 2,
                    pluckNumber(thmHeight, canvasHeight) * 0.13);
                rDefined = true;
            }

            if (rDefined) {
                thmhalfWidth =  thmBulbRadius * cos50;
                minCanW = thmWidth = 2 * thmhalfWidth;
                if (xDefined) {
                    if (isOnLeft) {
                        HCChartObj.marginLeft += marginDewToX = thmOriginX - thmhalfWidth - scaleWidth;
                    }
                    else {
                        HCChartObj.marginLeft += marginDewToX = thmOriginX - thmhalfWidth;
                    }
                }
                else {
                    if (isOnLeft) {
                        HCChartObj.marginRight += marginDewToX = (Math.min(thmBulbRadius, canvasWidth / 2) -
                            thmhalfWidth);
                    }
                    else {
                        HCChartObj.marginLeft += marginDewToX = (Math.min(thmBulbRadius, canvasWidth / 2) -
                            thmhalfWidth);
                    }
                }
                canvasWidth -= marginDewToX;
            }

            //Shift the drawing to the left as much as possible
            HCChartObj.marginRight += canvasWidth - thmWidth;
            // manage title Space
            if (hcJSON.title.alignWithCanvas) {
                canvasHeight -= titleHeight = this.manageTitleSpace(hcJSON, fcJSON, 0, canvasHeight / 2);
            }

            if (yDefined) {
                minCanH = thmOriginY - titleHeight + thmBulbRadius;
            }

            //manageDataLabelsSpace
            if (this.placeDataLabels) {
                canvasHeight -= this.placeDataLabels(hcJSON, minCanW, minCanH, chartTop, chartRight, chartBottom,
                    chartLeft);
            }

            if (!hDefined) {
                if (yDefined) {
                    HCChartObj.thmHeight = thmHeight =  Math.max(thmOriginY - titleHeight +
                        thmBulbRadius - thmhalfWidth, 3 * thmBulbRadius);
                }
                else {
                    HCChartObj.thmHeight = thmHeight =  Math.max(canvasHeight - thmhalfWidth, 3 * thmBulbRadius);
                }
                hDefined = true;
            }
            //now increase the top margin
            if (yDefined) {
                HCChartObj.marginTop += thmOriginY - titleHeight + thmBulbRadius - thmHeight;
            }
            else {
                HCChartObj.marginTop += canvasHeight - thmHeight;
            }
            //now increase the bottom margin
            bulbHeight = thmBulbRadius * (1 + sin50);
            HCChartObj.marginBottom += bulbHeight;
            HCChartObj.valuePadding += bulbHeight;
            HCChartObj.thmHeight = HCChartObj.plotHeight = thmHeight - bulbHeight;



            //manage other things if requared
            if (this.postDataLabelsPlacement) {
                this.postDataLabelsPlacement(hcJSON, minCanW, minCanH);
            }
        }

    }, chartAPI.gaugebase);

    // Cylinder //
    chartAPI('cylinder', {
        friendlyName: 'Cylinder Gauge',
        creditLabel: creditLabel,
        defaultSeriesType: 'cylinder',
        connectTickMarks: 0,
        rendererId: 'cylinder',
        tickMarkDistance: 2,
        standaloneInit: true,
        charttopmargin: 10,
        chartbottommargin: 10,
        chartrightmargin: 10,
        chartleftmargin: 10,
        isDataLabelBold: true,
        realtimeEnabled: true,
        alignCaptionWithCanvas: 0,

        defaultPaletteOptions : extend(extend2({}, defaultGaugePaletteOptions), {
            cylFillColor: ['CCCCCC', 'ADB68F', 'E1F5FF', 'FDB548', 'FF7CA0'],
            periodColor: ['EEEEEE', 'ECEEE6', 'E6ECF0', 'FFF4E6', 'FFF2F5']
        }),

        preSeriesAddition: function (HCObj, FCObj) {
            var HCChartObj = HCObj.chart,
            FCChartObj = FCObj.chart,
            colorM = this.colorManager,
            showHoverEffect = pluckNumber(FCChartObj.showhovereffect),
            cylFillHoverColor;


            //-------------------------- Gauge specific properties --------------------------//

            //Cylinder fill color
            HCChartObj.cylFillColor = pluck(FCChartObj.gaugefillcolor, FCChartObj.cylfillcolor,
                colorM.getColor('cylFillColor'));
            //Cylinder fill alpha
            HCChartObj.cylFillAlpha = pluck(FCChartObj.gaugefillalpha, FCChartObj.cylfillalpha, 100);

            //parse hove attributes
            if (showHoverEffect !== 0 && (showHoverEffect || FCChartObj.cylfillhovercolor ||
                    FCChartObj.plotfillhovercolor || FCChartObj.cylfillhoveralpha ||
                    FCChartObj.plotfillhoveralpha || FCChartObj.cylfillhoveralpha === 0)) {
                showHoverEffect = true;
                HCChartObj.plotHoverEffects = {};
                HCChartObj.plotHoverEffects.enabled = showHoverEffect;
                cylFillHoverColor = pluck(FCChartObj.cylfillhovercolor, FCChartObj.plotfillhovercolor, FILLMIXDARK10);
                HCChartObj.plotHoverEffects.cylFillHoverColor = /\{/.test(cylFillHoverColor) ?
                    colorM.parseColorMix(HCChartObj.cylFillColor, cylFillHoverColor)[0] : cylFillHoverColor;
                HCChartObj.plotHoverEffects.cylFillHoverAlpha = pluck(FCChartObj.cylfillhoveralpha,
                    FCChartObj.plotfillhoveralpha, HCChartObj.cylFillAlpha);
            }

            //Cylinder Glass color
            HCChartObj.cylGlassColor = pluck(FCChartObj.cylglasscolor, 'FFFFFF');

        },

        //retuen the point color as an object
        getPointColorObj: function (FCChartObj) {
            return {
                code: pluck(FCChartObj.gaugefillcolor, FCChartObj.thmfillcolor,
                    this.colorManager.getColor('cylFillColor')),
                alpha: pluckNumber(FCChartObj.gaugefillalpha, FCChartObj.thmfillalpha, 100)
            };
        },

        getPointStub: chartAPI.linearscalegauge,

        //can place one dataLabels at bottom
        placeDataLabels: chartAPI.linearscalegauge,

        //manage space for title and subtitle at top
        manageTitleSpace : chartAPI.linearscalegauge,

        /** @todo fix the spacemanagement issue for vertical axis with long limit labels. */
        spaceManager: function (hcJSON, fcJSON, width, height) {
            var HCChartObj = hcJSON.chart,
            FCChartObj = fcJSON.chart,
            //labelStyle = series.dataLabels.style,
            canvasWidth = width - (HCChartObj.marginRight + HCChartObj.marginLeft),
            canvasHeight =  height - (HCChartObj.marginTop + HCChartObj.marginBottom),
            chartRight = HCChartObj.marginRight,
            chartLeft = HCChartObj.marginLeft,
            chartTop = HCChartObj.marginTop,
            chartBottom = HCChartObj.marginBottom,
            minCanW = canvasWidth * 0.2,
            minCanH = canvasHeight * 0.3,
            cylYScale = pluckNumber(FCChartObj.cylyscale, 30),
            scaleFactor = this.scaleFactor,
            numberFormatter = this.numberFormatter,
            maxRadius,
            maxVerticalHeight,
            cylRadius,
            cylHeight,
            yScaleRadius,
            cylinderTotalHeight,
            remaningSpace;


            //manage title Space
            if (!hcJSON.title.alignWithCanvas) {
                canvasHeight -= this.manageTitleSpace(hcJSON, fcJSON, canvasWidth / 2, canvasHeight / 2);
            }

            //manage scaleSpace
            if (this.placeTickMark) {
                canvasWidth -= this.placeTickMark(hcJSON, minCanW, minCanH);
            }

            //manageDataLabelsSpace
            if (this.placeDataLabels) {
                // Reducing canvasHeight base border 8px.
                canvasHeight -= this.placeDataLabels(hcJSON, minCanW, minCanH,
                    chartTop, chartRight, chartBottom, chartLeft) + 8;
                HCChartObj.valuePadding += 8;
            }

            //manage other things if requared
            if (this.postDataLabelsPlacement) {
                this.postDataLabelsPlacement(hcJSON, minCanW, minCanH);
            }

            //HCChartObj.cylOriginX = getValidValue(FCChartObj.cyloriginx);
            //HCChartObj.cylOriginY = getValidValue(FCChartObj.cyloriginy);
            //HCChartObj.cylRadius = getValidValue(FCChartObj.cylradius);
            HCChartObj.cylHeight = getValidValue(FCChartObj.cylheight);
            //Y-Scale cannot be more than 50 or less than 0
            if (cylYScale > 50 || cylYScale < 0) {
                //Set to 30
                cylYScale = 30;
            }
            //Put in range 0-1
            HCChartObj.cylYScale = cylYScale = cylYScale / 100;


            //----------------------------------------------------------------------------//
            //We finally have the maximum space to be alloted
            //Restrict to a minimum of 10
            maxRadius = Math.max(mathMin(canvasWidth, canvasHeight * 1.2) / 2, 5);

            //Allot the radius
            cylRadius = pluckNumber(getValidValue(
                numberFormatter.getCleanValue(FCChartObj.cylradius, true)) *
                scaleFactor, maxRadius);

            HCChartObj.marginLeft = pluckNumber(getValidValue(FCChartObj.cyloriginx) * scaleFactor,
                HCChartObj.marginLeft);

            HCChartObj.marginRight = width - (HCChartObj.marginLeft + (cylRadius * 2));

            //manage title Space
            if (hcJSON.title.alignWithCanvas) {
                canvasHeight -= this.manageTitleSpace(hcJSON, fcJSON, canvasWidth / 2, canvasHeight / 2);
            }
            //Now, calculate the maximum possible height
            maxVerticalHeight = canvasHeight - ((cylRadius * cylYScale) * 2);
            //Now, over-ride user values, and apply scale factor
            cylHeight = pluckNumber(getValidValue(numberFormatter.getCleanValue(FCChartObj.cylheight, true)) *
                scaleFactor, maxVerticalHeight);

            yScaleRadius = HCChartObj.yScaleRadius = (cylRadius * cylYScale);
            cylinderTotalHeight = HCChartObj.cylinderTotalHeight = yScaleRadius * 2 + cylHeight;
            remaningSpace = canvasHeight - cylinderTotalHeight + HCChartObj.marginTop;
            HCChartObj.marginTop = pluckNumber((getValidValue(FCChartObj.cyloriginy) * scaleFactor) -
                cylHeight, yScaleRadius + remaningSpace);

            HCChartObj.marginBottom = height - (HCChartObj.marginTop + cylHeight);

            HCChartObj.cylRadius = cylRadius;
            HCChartObj.cylHeight = cylHeight;
            HCChartObj.yScaleRadius = yScaleRadius;

        }

    }, chartAPI.gaugebase);

    /* Angulargauge Charts */
    //helper function
    function angularGaugeSpaceManager (startAngle, endAngle, canvasW, canvasH,
        radius, centerX, centerY, compositPivotRadius, yPosExtra, yNegExtra) {
        var rediusDefined = defined(radius),
        centerXDefined = defined(centerX),
        centerYDefined = defined(centerY),
        PI2 = Math.PI * 2,
        PI = Math.PI,
        PIby2 = Math.PI / 2,
        PI3by2 = PI + PIby2,
        calculatedRadus,
        returnObj = {
            radius : radius,
            centerX : centerX,
            centerY : centerY
        },
        leftX, topY, rightX, bottomY, pivotCalRequard = false,
        startX, startY, endX, endY, tempRadius,
        resultantEnd, range, positiveLength, negativeLength,
        scale, startAbs = startAngle % PI2;
        if (startAbs < 0) {
            startAbs += PI2;
        }
        compositPivotRadius = compositPivotRadius || 0;
        if (compositPivotRadius && compositPivotRadius < canvasW / 2 && compositPivotRadius < canvasH / 2) {
            pivotCalRequard = true;
        }
        if (yPosExtra > canvasH / 2) {//max half height will be setteled
            yPosExtra = canvasH / 2;
        }
        if (yNegExtra > canvasH / 2) {//max half height will be setteled
            yNegExtra = canvasH / 2;
        }
        startX = Math.cos(startAngle);
        startY = Math.sin(startAngle);
        endX = Math.cos(endAngle);
        endY = Math.sin(endAngle);
        leftX = Math.min(startX, endX, 0);
        rightX = Math.max(startX, endX, 0);
        topY = Math.min(startY, endY, 0);
        bottomY = Math.max(startY, endY, 0);
        if (!rediusDefined || !centerXDefined || !centerYDefined) {
            scale = endAngle - startAngle;
            resultantEnd = startAbs + scale;
            if (resultantEnd > PI2 || resultantEnd < 0) {
                rightX = 1;
            }
            if (scale > 0) {
                if ((startAbs < PIby2 && resultantEnd > PIby2) || resultantEnd > PI2 + PIby2) {
                    bottomY = 1;
                }
                if ((startAbs < PI && resultantEnd > PI) || resultantEnd > PI2 + PI) {
                    leftX = -1;
                }
                if ((startAbs < PI3by2 && resultantEnd > PI3by2) || resultantEnd > PI2 + PI3by2) {
                    topY = -1;
                }
            }
            else {
                if ((startAbs > PIby2 && resultantEnd < PIby2) || resultantEnd < - PI3by2) {
                    bottomY = 1;
                }
                if ((startAbs > PI && resultantEnd < PI) || resultantEnd < - PI) {
                    leftX = -1;
                }
                if ((startAbs > PI3by2 && resultantEnd < PI3by2) || resultantEnd < - PIby2) {
                    topY = -1;
                }
            }
            //now decide the x, y and radius
            if (!centerXDefined) {
                range =  rightX - leftX;
                tempRadius = canvasW / range;
                centerX = -tempRadius * leftX;
                calculatedRadus = tempRadius;
                if (pivotCalRequard) {
                    if (canvasW - centerX < compositPivotRadius) {
                        centerX = canvasW - compositPivotRadius;
                        positiveLength = canvasW - centerX;
                        negativeLength = -centerX;
                        calculatedRadus = leftX ? Math.min(positiveLength / rightX, negativeLength / leftX):
                        positiveLength / rightX;
                    }
                    else if (centerX < compositPivotRadius){
                        centerX = compositPivotRadius;
                        positiveLength = canvasW - centerX;
                        negativeLength = -centerX;
                        calculatedRadus = leftX ? Math.min(positiveLength / rightX, negativeLength / leftX):
                        positiveLength / rightX;
                    }
                }
                returnObj.centerX = centerX;
            }
            else if (!rediusDefined) {
                positiveLength = canvasW - centerX;
                negativeLength = -centerX;
                calculatedRadus = leftX ? Math.min(positiveLength / rightX, negativeLength / leftX):
                positiveLength / rightX;
            }

            if (!centerYDefined) {
                range =  bottomY - topY;
                tempRadius = canvasH / range;
                centerY = -tempRadius * topY;
                if (pivotCalRequard) {
                    if (canvasH - centerY < compositPivotRadius) {
                        centerY = canvasH - compositPivotRadius;
                        positiveLength = canvasH - centerY;
                        negativeLength = -centerY;
                        calculatedRadus = Math.min(calculatedRadus, topY ? Math.min(positiveLength / bottomY,
                            negativeLength / topY) : positiveLength / bottomY);
                    }
                    else if (centerY < compositPivotRadius){
                        centerY = compositPivotRadius;
                        positiveLength = canvasH - centerY;
                        negativeLength = -centerY;
                        calculatedRadus = Math.min(calculatedRadus, topY ? Math.min(positiveLength / bottomY,
                            negativeLength / topY) : positiveLength / bottomY);
                    }
                }
                //yAxisExtra
                if (canvasH - centerY < yPosExtra) {
                    centerY = canvasH - yPosExtra;
                    positiveLength = canvasH - centerY;
                    negativeLength = -centerY;
                    calculatedRadus = Math.min(calculatedRadus, topY ? Math.min(positiveLength / bottomY,
                        negativeLength / topY) : positiveLength / bottomY);
                }
                else if (centerY < yNegExtra){
                    centerY = yNegExtra;
                    positiveLength = canvasH - centerY;
                    negativeLength = -centerY;
                    calculatedRadus = Math.min(calculatedRadus, topY ? Math.min(positiveLength / bottomY,
                        negativeLength / topY) : positiveLength / bottomY);
                }
                calculatedRadus = Math.min(calculatedRadus, tempRadius);
                returnObj.centerY = centerY;
            }
            else if (!rediusDefined) {
                positiveLength = canvasH - centerY;
                negativeLength = -centerY;
                calculatedRadus = Math.min(calculatedRadus, topY ? Math.min(positiveLength / bottomY,
                    negativeLength / topY) : positiveLength / bottomY);
            }
            returnObj.maxRadius = calculatedRadus;
            if (returnObj.maxRadius <= 0) {
                returnObj.maxRadius = Math.min(canvasW / 2, canvasH / 2);
            }
        }
        return returnObj;
    }


    chartAPI('angulargauge', {
        friendlyName: 'Angular Gauge',
        standaloneInit: true,
        drawAnnotations: true,
        defaultSeriesType : 'angulargauge',
        creditLabel: creditLabel,
        rendererId: 'angular',
        isAngular: true,
        eiMethods: chartAPI.lineargauge.eiMethods,
        multiValueGauge: true,
        realtimeEnabled: true,
        defaultPaletteOptions : extend(extend2({}, defaultGaugePaletteOptions), {
            dialColor: ['999999,ffffff,999999', 'ADB68F,F3F5DD,ADB68F', 'A2C4C8,EDFBFE,A2C4C8',
                'FDB548,FFF5E8,FDB548', 'FF7CA0,FFD1DD,FF7CA0'],
            dialBorderColor: ['999999', 'ADB68F', 'A2C4C8', 'FDB548', 'FF7CA0'],
            pivotColor: ['999999,ffffff,999999', 'ADB68F,F3F5DD,ADB68F', 'A2C4C8,EDFBFE,A2C4C8',
                'FDB548,FFF5E8,FDB548', 'FF7CA0,FFD1DD,FF7CA0'],
            pivotBorderColor: ['999999', 'ADB68F', 'A2C4C8', 'FDB548', 'FF7CA0']
        }),
        subTitleFontSizeExtender: 0,
        charttopmargin : 5,
        chartrightmargin : 5,
        chartbottommargin : 5,
        chartleftmargin : 5,
        defaultPlotShadow : 1,
        gaugeBorderColor : '{dark-20}',
        gaugeBorderThickness : 1,

        updateSnapPoints: function(hc) {
            chartAPI.gaugebase.updateSnapPoints.apply(this, arguments);

            var series = hc.series[0],
            snaps = this.snapLiterals;

            snaps.gaugestartangle = hc.chart.gaugeStartAngle  / deg2rad;
            snaps.gaugeendangle = hc.chart.gaugeEndAngle / deg2rad;

            snaps.chartcenterx = snaps.gaugecenterx = series.gaugeOriginX;
            snaps.chartcentery = snaps.gaugecentery = series.gaugeOriginY;
            snaps.gaugeinnerradius = series.gaugeInnerRadius;
            snaps.gaugeouterradius = series.gaugeOuterRadius;

            snaps.dial = function (subtokens) {
                var series = hc.series[0],
                    dials = series.data,
                    dialIndex = (Number(subtokens[0]) || 0),
                    macroName = (subtokens[1] || subtokens[0]),
                    dial = dials[dialIndex],
                    graphic = dial && dial.graphic,
                    matrix,
                    ret;

                if (graphic) {
                    matrix = graphic.matrix;
                    switch (macroName) {
                        case 'startx':
                            ret = series.gaugeOriginX + matrix.x(-(dial.rearExtension), 0);
                            break;

                        case 'starty':
                            ret = series.gaugeOriginY + matrix.y(-(dial.rearExtension), 0);
                            break;

                        case 'endx':
                            ret = series.gaugeOriginX + matrix.x(dial.radius, 0);
                            break;

                        case 'endy':
                            ret = series.gaugeOriginY + matrix.y(dial.radius, 0);
                            break;

                        default:
                            ret = 0;
                    }

                    return ret;
                }
                else {
                    return 0;
                }
            };
        },

        preSeriesAddition: function (hc, obj){
            //***** determine the start and end angle *****//

            var FCChartObj = obj.chart,
            scaleAngle = pluckNumber(FCChartObj.gaugescaleangle, 180),
            startAngle = pluckNumber(FCChartObj.gaugestartangle),
            endAngle = pluckNumber(FCChartObj.gaugeendangle),
            startDefined = defined(startAngle), tempAngle,
            //arc on 360deg is not possable SVG limitation so reduce the scale
            circleHandler = hasSVG ? 0.001 : 0.01,
            endDefined= defined(endAngle);

            /*
             *All angle should be in range of -360 to 360 of traditional methode
             *At the end convert them in computer graphics methode
             * relation among them is [scaleAngle = startAngle - endAngle;]
             */

            if (scaleAngle > 360 || scaleAngle < -360) {
                scaleAngle = scaleAngle > 0 ? 360 : -360;
            }
            if (endAngle > 360 || endAngle < -360) {
                endAngle = endAngle % 360;
            }
            if (startAngle > 360 || startAngle < -360) {
                startAngle = startAngle % 360;
            }

            //booth defined
            if (startDefined && endDefined) {
                //override the scale
                scaleAngle = startAngle - endAngle;
                //validate scale and EndAngle
                if (scaleAngle > 360 || scaleAngle < -360) {
                    scaleAngle = scaleAngle % 360;
                    endAngle = startAngle - scaleAngle;
                }
            }
            else if (startDefined) {//StartAngle Defined
                //derive endAngle
                endAngle = startAngle - scaleAngle;
                //if derived end angle cross the limit
                if (endAngle > 360 || endAngle < -360) {
                    endAngle = endAngle % 360;
                    startAngle += endAngle > 0 ? -360 : 360;
                }
            }
            else if (endDefined) {//endAngle Defined
                //derive StartAngle
                startAngle = endAngle + scaleAngle;
                //if derived start angle cross the limit
                if (startAngle > 360 || startAngle < -360) {
                    startAngle = startAngle % 360;
                    endAngle += startAngle > 0 ? -360 : 360;
                }
            }
            else {//booth will be derived
                if (scaleAngle === 360) {
                    startAngle = 180;
                    endAngle = - 180;
                }
                else  if (scaleAngle === -360) {
                    startAngle = -180;
                    endAngle = -180;
                }
                else {
                    tempAngle = scaleAngle / 2;
                    startAngle = 90 + tempAngle;
                    endAngle = startAngle - scaleAngle;
                }

            }
            //Full 360 can't be drawn by arc[limitation]
            if (Math.abs(scaleAngle) === 360) {
                scaleAngle += scaleAngle > 0 ? -circleHandler : circleHandler;
                endAngle = startAngle - scaleAngle;
            }

            //convert all the angles into clockwise cordinate
            endAngle = 360 - endAngle;
            startAngle = 360 - startAngle;
            scaleAngle = -scaleAngle;

            //if start angle cross the limit
            if (startAngle > 360 || endAngle > 360 ) {
                startAngle -= 360;
                endAngle -= 360;
            }
            //convert into red
            hc.chart.gaugeStartAngle = startAngle = startAngle * deg2rad;
            hc.chart.gaugeEndAngle = endAngle = endAngle * deg2rad;
            hc.chart.gaugeScaleAngle = scaleAngle = scaleAngle * deg2rad;

        },

        series: function (FCObj, HCObj) {
            var iapi = this,
                series = {
                data : [],
                // for single series the color will be added point by point from palette
                colorByPoint: true
            },
            // FusionCharts Chart Obj
            chartAttrs = FCObj.chart,
            colorRange = iapi.colorRangeGetter,
            colorArray = colorRange && colorRange.colorArr,
            colorCount = colorArray && colorArray.length,
            HCConfig = HCObj[CONFIGKEY],
            NumberFormatter = this.numberFormatter,
            colorM = this.colorManager,
            // Value
            itemValue,
            setToolText,
            formatedValue,
            //Whether to show the value below the chart
            showValue = series.showValue = pluckNumber(chartAttrs.showvalue, chartAttrs.showrealtimevalue , 0),
            // Length of the default colors
            /** @todo have to calculate it */
            scaleFactor = this.scaleFactor,
            compositPivotRadius = 0,
            dialArr = FCObj.dials && FCObj.dials.dial,
            borderColor,
            dialBorderColor,
            borderThickness,
            showHoverEffect = pluckNumber(chartAttrs.showhovereffect),
            showDialHoverEffect,
            borderHoverColor,
            borderHoverThickness,
            borderHoverAlpha,
            bgHoverColor,
            hoverFill,
            bgHoverAlpha,
            hoverRadius,
            baseHoverWidth,
            topHoverWidth,
            rearHoverExtension,
            hasBorderHoverMix,
            hoverAttr,
            radius,
            baseWidth,
            hasHoverSizeChange,
            topWidth,
            outAttr,
            bgColor,
            bgAlpha,
            hasHoberFillMix,
            dialFill,
            value,

            //attrubutes to be retrived before the points parse
            editMode = pluckNumber(chartAttrs.editmode, 0),
            pivotRadius,
            index,
            length,
            dialObj,
            rearExtension,
            displayValue,
            isLabelString,
            pointShowValue,
            valueY,
            displayValueCount,
            borderalpha;

            pivotRadius = compositPivotRadius = pluckNumber(getValidValue(chartAttrs.pivotradius) * scaleFactor, 5);



            series.pivotRadius = pivotRadius;


            //*****   parse the point   ******//

            index = 0;
            length = dialArr && dialArr.length;
            displayValueCount = 0;

            //fix for null or no data
            //gauge will show the dial at min value
            if (!length) {
                index = -1;
                length = 0;
                dialArr = [];
            }
            //enable chart lavel HoverEffect if there has any hover attribute in chart lavel
            if (showHoverEffect !== 0 && (showHoverEffect || chartAttrs.dialborderhovercolor ||
                    chartAttrs.dialborderhoveralpha || chartAttrs.dialborderhoveralpha === 0 ||
                    chartAttrs.dialborderhoverthickness || chartAttrs.dialborderhoverthickness === 0 ||
                    chartAttrs.dialbghovercolor || chartAttrs.plotfillhovercolor ||
                    chartAttrs.dialbghoveralpha || chartAttrs.plotfillhoveralpha || chartAttrs.dialbghoveralpha === 0)){
                showHoverEffect = 1;
            }
            for (; index < length; index += 1) {
                dialObj = dialArr[index] || {};
                itemValue = NumberFormatter.getCleanValue(dialObj.value);

                if (this.pointValueWatcher) {
                    this.pointValueWatcher(itemValue);
                }

                rearExtension = pluckNumber(dialObj.rearextension, 0);
                compositPivotRadius = Math.max(compositPivotRadius, rearExtension * scaleFactor);
                formatedValue = NumberFormatter.dataLabels(itemValue);
                displayValue = getValidValue(formatedValue, BLANKSTRING);
                pointShowValue = pluckNumber(dialObj.showvalue, showValue);
                valueY = pluckNumber(getValidValue(dialObj.valuey) * scaleFactor);
                isLabelString = pluck(dialObj.tooltext, dialObj.hovertext) ? true : false;
                if (pointShowValue && !defined(valueY)) {
                    displayValueCount += 1;
                }
                setToolText = getValidValue(parseUnsafeString(pluck(dialObj.tooltext, dialObj.hovertext,
                    HCConfig.tooltext)));
                if (setToolText){
                    setToolText = parseTooltext(setToolText, [1,2], {
                        formattedValue: formatedValue
                    }, dialObj, chartAttrs);
                }
                else {
                    setToolText = displayValue;
                }
                bgColor = pluck(dialObj.color, dialObj.bgcolor, colorM.getColor('dialColor'));
                bgAlpha = pluckNumber(dialObj.alpha, dialObj.bgalpha, 100);
                dialFill = toRaphaelColor({
                        FCcolor : {
                            color: bgColor,
                            alpha: bgAlpha,
                            angle : 90
                        }
                    });
                borderColor = pluck(dialObj.bordercolor, colorM.getColor('dialBorderColor'));
                borderalpha = pluckNumber(dialObj.borderalpha, 100);
                dialBorderColor = convertColor(borderColor, borderalpha);
                borderThickness = pluckNumber(dialObj.borderthickness, 1);
                radius = pluckNumber(dialObj.radius);
                baseWidth = pluckNumber(dialObj.basewidth);
                topWidth = pluckNumber(dialObj.topwidth, 0);

                showDialHoverEffect = pluckNumber(dialObj.showhovereffect, showHoverEffect);
                if (showDialHoverEffect !== 0 && (showDialHoverEffect || dialObj.borderhovercolor ||
                        dialObj.borderhoveralpha || dialObj.borderhoveralpha === 0 ||
                        dialObj.borderhoverthickness || dialObj.borderhoverthickness === 0 ||
                        dialObj.bghovercolor || dialObj.bghoveralpha || dialObj.bghoveralpha === 0)) {
                    showDialHoverEffect = true;
                    outAttr = {};
                    hoverAttr = {};
                    borderHoverColor = pluck(dialObj.borderhovercolor, chartAttrs.dialborderhovercolor, FILLMIXDARK10);
                    borderHoverAlpha = pluckNumber(dialObj.borderhoveralpha,
                        chartAttrs.dialborderhoveralpha, borderalpha);
                    borderHoverThickness = pluckNumber(dialObj.borderhoverthickness,
                        chartAttrs.dialborderhoverthickness, borderThickness);

                    if (borderHoverThickness){
                        outAttr.stroke = dialBorderColor;
                        hasBorderHoverMix = /\{/.test(borderHoverColor);
                        hoverAttr.stroke = convertColor(hasBorderHoverMix ?
                            colorM.parseColorMix(borderColor, borderHoverColor)[0] :
                            borderHoverColor, borderHoverAlpha);
                    }
                    if (borderHoverThickness !== borderThickness) {
                        hoverAttr['stroke-width'] = borderHoverThickness;
                        outAttr['stroke-width'] = borderThickness;
                    }

                    bgHoverColor = pluck(dialObj.bghovercolor, chartAttrs.dialbghovercolor,
                        chartAttrs.plotfillhovercolor, FILLMIXDARK10);
                    bgHoverAlpha = pluckNumber(dialObj.bghoveralpha, chartAttrs.dialbghoveralpha,
                        chartAttrs.plotfillhoveralpha, bgAlpha);
                    outAttr.fill = dialFill;
                    hasHoberFillMix = /\{/.test(bgHoverColor);

                    bgHoverColor = hasHoberFillMix ? colorM.parseColorMix(bgColor,
                        bgHoverColor).join() : bgHoverColor;
                    hoverFill = {
                        FCcolor : {
                            color: bgHoverColor,
                            alpha: bgHoverAlpha,
                            angle : 90
                        }
                    };
                    hoverAttr.fill = toRaphaelColor(hoverFill);

                }

                //Create the dial object
                series.data.push({
                    rolloverProperties: {
                        enabled: showDialHoverEffect,
                        hasHoverSizeChange: hasHoverSizeChange,
                        hoverRadius: pluckNumber(hoverRadius * scaleFactor),
                        baseHoverWidth: pluckNumber(baseHoverWidth * scaleFactor, pivotRadius * 1.6),
                        topHoverWidth: pluckNumber(topHoverWidth * scaleFactor),
                        rearHoverExtension: pluckNumber(rearHoverExtension * scaleFactor),
                        hoverFill: hoverFill,
                        hoverAttr: hoverAttr,
                        outAttr: outAttr
                    },
                    _tooltext: pluck(dialObj.tooltext, dialObj.hovertext),
                    y: itemValue,
                    id: pluck(dialObj.id, index),
                    color: dialFill,
                    showValue: pointShowValue,
                    editMode: pluckNumber(dialObj.editmode, editMode),
                    borderColor: dialBorderColor,
                    shadowAlpha: borderalpha,
                    borderThickness: borderThickness,
                    baseWidth: pluckNumber(baseWidth * scaleFactor, pivotRadius * 1.6),
                    topWidth: pluckNumber(topWidth * scaleFactor),
                    rearExtension: rearExtension * scaleFactor,
                    valueX: pluckNumber(getValidValue(dialObj.valuex) * scaleFactor),
                    valueY: valueY,
                    radius: pluckNumber(radius * scaleFactor),
                    link: pluck(dialObj.link, BLANKSTRING),
                    isLabelString: isLabelString,
                    toolText: setToolText,
                    displayValue: pointShowValue ? pluck(displayValue, ' ') : BLANKSTRING,
                    doNotSlice: true
                });
            }

            series.displayValueCount = displayValueCount;
            series.compositPivotRadius = compositPivotRadius;
            HCObj.series[0] = series;

            // If color range exists then include the min and max from color range
            // to recalculate min and max of the gauge scale.
            if (colorCount && iapi.pointValueWatcher &&
                    pluckNumber(chartAttrs.includecolorrangeinlimits,
                        iapi.includeColorRangeInLimits)) {
                value = pluckNumber(colorArray[0].minvalue);
                if (defined(value)) {
                    iapi.pointValueWatcher(value);
                }

                value = pluckNumber(colorArray[colorCount - 1].maxvalue);
                if (defined(value)) {
                    iapi.pointValueWatcher(value);
                }
            }

        },

        postSeriesAddition: function(hc, obj){

            var FCChartObj = obj.chart,
                series = hc.series[0],
                colorM = this.colorManager,
                pvColor;



            //Whether to show value below or above
            series.valueBelowPivot = pluckNumber(FCChartObj.valuebelowpivot ,  0);

            //**** calculate the tick marks and axis min max ****//
            // based on the startAngle, endAngle and scaleAngle,
            // calculate the tick space.







            //-------------------------- Gauge specific properties --------------------------//

            //Gauge fill properties
            series.gaugeFillMix = FCChartObj.gaugefillmix;
            series.gaugeFillRatio = FCChartObj.gaugefillratio;
            //Set defaults
            if (series.gaugeFillMix === undefined){
                series.gaugeFillMix = '{light-10},{light-70},{dark-10}';
            }
            if (series.gaugeFillRatio === undefined){
                series.gaugeFillRatio = ',6';
            }else if (series.gaugeFillRatio !== ''){
                //Append a comma before the ratio
                series.gaugeFillRatio = ',' + series.gaugeFillRatio;
            }

            //Parse the color, alpha and ratio array for each color range arc.
            pvColor = colorM.parseColorMix(
                pluck(FCChartObj.pivotfillcolor, FCChartObj.pivotcolor, FCChartObj.pivotbgcolor,
                    colorM.getColor('pivotColor')),
                pluck(FCChartObj.pivotfillmix, '{light-10},{light-30},{dark-20}'));
            series.pivotFillAlpha = colorM.parseAlphaList(pluck(FCChartObj.pivotfillalpha,
                HUNDREDSTRING), pvColor.length);
            series.pivotFillRatio = colorM.parseRatioList(pluck(FCChartObj.pivotfillratio, ZEROSTRING), pvColor.length);
            series.pivotFillColor = pvColor.join();
            series.pivotFillAngle = pluckNumber(FCChartObj.pivotfillangle, 0);
            series.isRadialGradient = pluck(FCChartObj.pivotfilltype, 'radial').toLowerCase() == 'radial';
            //Pivot border properties
            series.showPivotBorder = pluckNumber(FCChartObj.showpivotborder, 0);
            series.pivotBorderThickness = pluckNumber(FCChartObj.pivotborderthickness, 1);
            series.pivotBorderColor = convertColor(
                pluck(FCChartObj.pivotbordercolor, colorM.getColor('pivotBorderColor')),
                series.showPivotBorder == 1 ? pluck(FCChartObj.pivotborderalpha, HUNDREDSTRING) : ZEROSTRING);

            // Putting the parseColorMin function in chartAPI to be use later in drawing of color range
            this.parseColorMix = colorM.parseColorMix;
            this.parseAlphaList = colorM.parseAlphaList;
            this.parseRatioList = colorM.parseRatioList;

        },

        spaceManager: function(HCObj, FCObj, width, height){
            var iapi = this,
            HCChartObj = HCObj.chart,
            FCChartObj  = FCObj.chart,
            scale = HCObj.scale,
            series = HCObj.series[0],
            displayValueCount = series.displayValueCount,
            valueStyle = scale.tickValues.style,
            labelHeight = pluckNumber(parseInt(valueStyle.lineHeight, 10), 12),
            labelFontSize = pluckNumber(parseInt(valueStyle.fontSize, 10), 10),
            baseLineDistance = labelFontSize * 0.8,//(hasSVG ? 0.8 : 1),
            //assumed and tested that it gose well for all font
            baseLineBottomSpace = labelHeight * 0.1,//(hasSVG ? 0.1 : 0.3),
            VMLYShift = hasSVG ? 0 : (labelHeight * 0.1),//assumed and tested that it gose well for all font
            gaugeSpacingObj,
            displayValueLineHeight = pluckNumber(parseInt(HCObj.plotOptions.series.dataLabels.style.lineHeight, 10),
                12),
            pivotRadius = series.pivotRadius,
            canvasW = width - (HCChartObj.marginRight + HCChartObj.marginLeft),
            canvasH = height - (HCChartObj.marginTop + HCChartObj.marginBottom),
            scaleFactor = this.scaleFactor,
            compositPivotRadius = series.compositPivotRadius,
            centerX, centerY,
            startAngle = HCChartObj.gaugeStartAngle,
            endAngle = HCChartObj.gaugeEndAngle,
            innerRadiusFactor,
            yPosExtra = displayValueCount * displayValueLineHeight + 2 + pivotRadius,
            yNegExtra = 0,
            valueBelowPivot = series.valueBelowPivot,
            majorTM,
            TMIndex,
            TMlength,
            labelStr,
            smartLabel,smartText, stWidth, stHeight, stHeightHalf,
            TMObj,
            minValue,
            valueRange,
            cosThita,
            sinThita, labelX, labelY,
            xPos,
            xNeg,
            yPos,
            yNeg,
            placeValuesInside,
            limitingValue,
            limitingNegValue,
            outerRadiusDefined,
            tickValueDistance,
            showTickValues,
            showLimits,
            tempOuterRadius,
            tempInnerRadius,
            calculatedRadius,
            minRadius,
            LabelInsideRadius,
            labelWidth,
            maxY,
            usedY,
            textHeight,
            minLabelWidthForWrapping,
            angleRange,
            angle,
            angleValueFactor;



            if (/^\d+\%$/.test(FCChartObj.gaugeinnerradius)) {
                innerRadiusFactor = parseInt(FCChartObj.gaugeinnerradius, 10) / 100;
            }
            else {
                innerRadiusFactor = 0.7;
            }

            //manage the space for caption
            canvasH -=  iapi.titleSpaceManager(HCObj, FCObj, canvasW, canvasH / 2);

            if (!valueBelowPivot) {
                yNegExtra = yPosExtra;
                yPosExtra = 0;
            }
            // gaugeOuterRadius does not have any default value.
            series.gaugeOuterRadius = pluckNumber(Math.abs(getValidValue(FCChartObj.gaugeouterradius) * scaleFactor));
            //Asume gauge inner radius to be a default of 70% of gauge outer radius
            series.gaugeInnerRadius = pluckNumber(Math.abs(getValidValue(FCChartObj.gaugeinnerradius) * scaleFactor),
                series.gaugeOuterRadius * innerRadiusFactor);

            gaugeSpacingObj = angularGaugeSpaceManager (HCChartObj.gaugeStartAngle, HCChartObj.gaugeEndAngle,
                canvasW, canvasH, series.gaugeOuterRadius,
                pluckNumber((getValidValue(FCChartObj.gaugeoriginx) * scaleFactor) - HCChartObj.marginLeft),
                pluckNumber((getValidValue(FCChartObj.gaugeoriginy) * scaleFactor) - HCChartObj.marginTop),
                    Math.max(compositPivotRadius, labelFontSize),
                yPosExtra, yNegExtra);

            centerX = series.gaugeOriginX = gaugeSpacingObj.centerX;
            centerY = series.gaugeOriginY = gaugeSpacingObj.centerY;

            majorTM = scale.majorTM;
            TMIndex = 0;
            TMlength = majorTM.length;
            smartLabel = HCObj.labels.smartLabel;

            minValue = scale.min;
            valueRange = scale.max - scale.min;
            xPos = canvasW - centerX;
            xNeg = centerX;
            yPos = canvasH - centerY;
            yNeg = centerY;
            placeValuesInside = scale.placeValuesInside;
            limitingValue = Math.cos(89.98 * deg2rad);
            limitingNegValue = -limitingValue;
            outerRadiusDefined = defined(series.gaugeOuterRadius);
            tickValueDistance = scale.tickValueDistance;
            showTickValues = scale.showTickValues;
            showLimits = scale.showLimits;
            tempOuterRadius = pluckNumber(series.gaugeOuterRadius, gaugeSpacingObj.maxRadius);
            tempInnerRadius = pluckNumber(series.gaugeInnerRadius, tempOuterRadius * innerRadiusFactor);
            calculatedRadius = tempOuterRadius;
            minRadius = tempOuterRadius * 0.2;
            minLabelWidthForWrapping = labelHeight * 1.5;
            angleRange = endAngle - startAngle;
            angleValueFactor = angleRange / valueRange;

            //if any label is visiable
            if (showTickValues || showLimits) {
                if (placeValuesInside){
                    if(tempInnerRadius > tickValueDistance + labelHeight) {
                        LabelInsideRadius = tempInnerRadius - tickValueDistance;
                    }
                    else {
                        LabelInsideRadius = tempInnerRadius;
                        tickValueDistance = 0;
                    }

                }
                else {
                    calculatedRadius += tickValueDistance;
                    if (!outerRadiusDefined){
                        //if (minRadius + tickValueDistance < maxRadius) {
                        minRadius += tickValueDistance;
                    }
                }

                //manage the space for tick mark and labels and decide the radius from;
                smartLabel.setStyle(valueStyle);
                for (;TMIndex < TMlength; TMIndex += 1) {
                    TMObj = majorTM[TMIndex];
                    angle = startAngle + ((TMObj.value - minValue) * angleValueFactor);
                    cosThita = Math.cos(angle);
                    sinThita = Math.sin(angle);
                    labelStr = TMObj.displayValue;
                    smartText = smartLabel.getOriSize(labelStr);
                    stWidth = smartText.width;
                    stHeight = smartText.height;
                    stHeightHalf = stHeight / 2;


                    if (stWidth > 0 && stHeight > 0) {
                        //TMObj.y = labelHeight - stHeight / 2;
                        TMObj.x = 0;
                        //labels are inside
                        if (placeValuesInside) {
                            TMObj.align = cosThita > limitingValue ? POSITION_RIGHT :
                            (cosThita < limitingNegValue ? POSITION_LEFT : POSITION_CENTER);

                            if (TMObj.isString) {
                                labelX = LabelInsideRadius * cosThita;
                                labelY = LabelInsideRadius * sinThita;
                                labelWidth = Math.abs(labelX);
                                if (labelWidth < stWidth) {
                                    smartText = smartLabel.getSmartText(labelStr,
                                        Math.max(labelWidth, labelHeight), minLabelWidthForWrapping);
                                    TMObj.displayValue = smartText.text;
                                    smartText.tooltext && (TMObj.originalText = smartText.tooltext);

                                    stWidth = smartText.width;
                                    stHeight = smartText.height;
                                    stHeightHalf = stHeight / 2;
                                }
                            }

                            //set the text Y
                            if (cosThita > limitingValue || cosThita < limitingNegValue) {
                                TMObj.y = labelFontSize - stHeightHalf + VMLYShift;
                                TMObj.y -= stHeight * 0.4 * sinThita;
                            }
                            else {
                                TMObj.y = baseLineDistance - (sinThita < 0 ? 0 : (stHeight - baseLineBottomSpace));
                            }

                        }
                        //labels are outsides
                        else {

                            TMObj.align = cosThita > limitingValue ? POSITION_LEFT :
                            (cosThita < limitingNegValue ? POSITION_RIGHT : POSITION_CENTER);
                            labelX = calculatedRadius * cosThita;
                            labelY = calculatedRadius * sinThita;

                            //adjust the heights for non defined outer radius
                            if (!outerRadiusDefined) {
                                if (labelY > 0) {
                                    textHeight = stHeightHalf + stHeightHalf * sinThita;
                                    if (yPos < labelY + textHeight) {
                                        labelY = yPos - textHeight;
                                        calculatedRadius = Math.max(labelY / sinThita, minRadius);
                                    }
                                }
                                else if (labelY < 0) {
                                    textHeight = stHeightHalf - stHeightHalf * sinThita;
                                    if (yNeg < -labelY + textHeight) {
                                        labelY = textHeight - yNeg;
                                        calculatedRadius = Math.max(labelY / sinThita, minRadius);
                                    }
                                }
                            }

                            if (cosThita > limitingValue) {//at right half

                                if (labelX + stWidth > xPos) {//labels are going out
                                    if (!outerRadiusDefined) {//Adjust radius
                                        labelX  = xPos - stWidth;
                                        calculatedRadius = Math.max(labelX / cosThita, minRadius);
                                        labelX = calculatedRadius * cosThita;
                                        if (TMObj.isString && labelX + stWidth > xPos) {
                                            smartText = smartLabel.getSmartText(labelStr, xPos - labelX,
                                                minLabelWidthForWrapping);
                                            TMObj.displayValue = smartText.text;
                                            smartText.tooltext && (TMObj.originalText = smartText.tooltext);
                                            stHeight = smartText.height;
                                            stHeightHalf = stHeight / 2;
                                            stWidth = smartText.width;
                                            labelX  = xPos - stWidth;
                                            calculatedRadius = Math.max(labelX / cosThita, minRadius);
                                        }
                                    }
                                    else if (TMObj.isString) {//adjust the labels
                                        smartText = smartLabel.getSmartText(labelStr, xPos - labelX,
                                            minLabelWidthForWrapping);
                                        TMObj.displayValue = smartText.text;
                                        smartText.tooltext && (TMObj.originalText = smartText.tooltext);
                                        stHeight = smartText.height;
                                        stHeightHalf = stHeight / 2;
                                    }
                                }
                                //set the text Y
                                TMObj.y = labelFontSize - stHeightHalf + VMLYShift + (stHeight * 0.4 * sinThita);

                            }
                            else if (cosThita < limitingNegValue) {//at left half

                                if (stWidth - labelX > xNeg) {
                                    if (!outerRadiusDefined) {//Adjust radius
                                        labelX  = stWidth - xNeg;
                                        calculatedRadius = Math.max(labelX / cosThita, minRadius);
                                        labelX = calculatedRadius * cosThita;
                                        if (TMObj.isString && stWidth - labelX > xNeg) {
                                            smartText = smartLabel.getSmartText(labelStr, xNeg + labelX,
                                                minLabelWidthForWrapping);
                                            TMObj.displayValue = smartText.text;
                                            smartText.tooltext && (TMObj.originalText = smartText.tooltext);
                                            stWidth = smartText.width;
                                            stHeight = smartText.height;
                                            stHeightHalf = stHeight / 2;
                                            labelX  = stWidth - xNeg;
                                            calculatedRadius = Math.max(labelX / cosThita, minRadius);
                                        }
                                    }
                                    else if (TMObj.isString) {
                                        smartText = smartLabel.getSmartText(labelStr, xNeg + labelX,
                                            minLabelWidthForWrapping);
                                        TMObj.displayValue = smartText.text;
                                        smartText.tooltext && (TMObj.originalText = smartText.tooltext);
                                        stHeight = smartText.height;
                                        stHeightHalf = stHeight / 2;
                                    }
                                }
                               //set the text Y
                                TMObj.y = labelFontSize - stHeightHalf + VMLYShift + (stHeight * 0.4 * sinThita);

                            }
                            else {

                                if (sinThita > 0) {
                                    maxY = yPos;
                                    usedY = stHeight + labelY;
                                }
                                else {
                                    maxY = yNeg;
                                    usedY = stHeight - labelY;
                                }
                                if (!outerRadiusDefined) {
                                    if (usedY > maxY) {
                                        calculatedRadius = Math.max(maxY - stHeight, minRadius);
                                        usedY = stHeight + calculatedRadius;
                                    }
                                    if (TMObj.isString && (usedY > maxY) || (stWidth > canvasW)) {
                                        smartText = smartLabel.getSmartText(labelStr, canvasW,
                                            Math.max(maxY - minRadius, labelHeight));
                                        TMObj.displayValue = smartText.text;
                                        smartText.tooltext && (TMObj.originalText = smartText.tooltext);
                                        stHeight = smartText.height;
                                        stHeightHalf = stHeight / 2;
                                        calculatedRadius = Math.max(maxY - stHeight, minRadius);
                                    }

                                }
                                else if (TMObj.isString && (usedY > maxY) || (stWidth > canvasW)) {
                                    smartText = smartLabel.getSmartText(labelStr, canvasW,
                                        Math.max(stHeight - usedY + maxY, labelHeight));
                                    TMObj.displayValue = smartText.text;
                                    smartText.tooltext && (TMObj.originalText = smartText.tooltext);
                                    stHeight = smartText.height;
                                    stHeightHalf = stHeight / 2;
                                }

                                //set the text Y
                                TMObj.y = baseLineDistance - (sinThita > 0 ? 0 : (stHeight - baseLineBottomSpace));

                            }

                        }
                    }
                }

            }
            if (!outerRadiusDefined) {
                if(placeValuesInside) {
                    series.gaugeOuterRadius = calculatedRadius;
                }
                else {
                    series.gaugeOuterRadius = calculatedRadius - tickValueDistance;
                }

                if (series.gaugeOuterRadius <= 0) {
                    series.gaugeOuterRadius = Math.abs(minRadius);
                }
            }

            //calculate the space for tick marks
            /** @todo calculate the space for tick mark when it gose outside */
            /* if (series.showTickMarks) {
                    if (series.placeTicksInside) {
                        maxTickHeight = Math.max(series.majorTMHeight, series.minorTMHeight);
                        maxTickHeight = maxTickHeight > 0 ? maxTickHeight : 0;
                    }
                    else {
                        maxTickHeight = Math.min(series.majorTMHeight, series.minorTMHeight);
                        maxTickHeight = maxTickHeight < 0 ? Math.abs(maxTickHeight) : 0;
                    }
                    calculatedRadius = maxRadius - maxTickHeight;
                }*/





            //Asume gauge inner radius to be a default of 70% of gauge outer radius
            series.gaugeInnerRadius = pluckNumber(series.gaugeInnerRadius, series.gaugeOuterRadius * innerRadiusFactor);
        }
    }, chartAPI.gaugebase);

    /* Bulb Charts */
    chartAPI('bulb', {
        friendlyName: 'Bulb Gauge',
        defaultSeriesType : 'bulb',
        defaultPlotShadow: 1,
        standaloneInit: true,
        drawAnnotations: true,
        charttopmargin : 10,
        chartrightmargin : 10,
        chartbottommargin : 10,
        chartleftmargin : 10,
        realtimeEnabled: true,
        isDataLabelBold : true,
        rendererId: 'bulb',

        preSeriesAddition: function (HCObj) {
            var HCChartObj = HCObj.chart;
            HCChartObj.colorRangeGetter = this.colorRangeGetter;
            HCChartObj.defaultColors = this.colorManager.getPlotColor(0);
            HCChartObj.defaultColLen = HCChartObj.defaultColors.length;
        },

        // Function that produce the point color
        getPointColor: function (color, alpha, is3d) {
            if (!is3d) {
                return convertColor(color, alpha);
            }

            return {
                FCcolor : {
                    cx: 0.4,
                    cy: 0.4,
                    r: '80%',
                    color :  getLightColor(color, 65) + COMMASTRING + getLightColor(color, 75) + COMMASTRING +
                        getDarkColor(color, 65),
                    alpha : alpha + COMMASTRING + alpha + COMMASTRING + alpha,
                    ratio : '0,30,70', //BGRATIOSTRING,
                    radialGradient : true
                }
            };
        },

        getPointStub: function (dataObj, i, HCObj, FCObj, label) {
            var HCChartObj = HCObj.chart,
                HCConfig = HCObj[CONFIGKEY],
                FCChartObj = FCObj.chart,
                numberFormatter = this.numberFormatter,
                itemValue = numberFormatter.getCleanValue(dataObj.value),
                formatedVal = numberFormatter.dataLabels(itemValue),
                dataLink = getValidValue(dataObj.link),
                setToolText = getValidValue(parseUnsafeString(pluck(dataObj.tooltext, HCConfig.tooltext))),
                setDisplayValue = getValidValue(parseUnsafeString(
                    dataObj.displayvalue)),
                colorCodeObj = this.colorRangeGetter.getColorObj(itemValue),
                useColorNameAsValue = HCChartObj.useColorNameAsValue =
                pluckNumber(FCChartObj.usecolornameasvalue, 0),
                colorObj = colorCodeObj.colorObj || colorCodeObj.prevObj ||
                    // Fix for BUG: FWXT-708
                    colorCodeObj.nextObj || {},
                colorM = this.colorManager,
                colorName = parseUnsafeString(pluck(colorObj.label,
                    colorObj.name)),
                //-------------------------- Gauge specific properties --------------------------//
                //Gauge fill alpha
                gaugeFillAlpha = pluck(FCChartObj.gaugefillalpha,
                    colorObj.alpha, HUNDREDSTRING),
                //Gauge Border properties
                gaugeBorderColorCode =  pluck(colorObj.bordercolor,
                    FCChartObj.gaugebordercolor, getDarkColor(colorObj.code, 70)),
                // default dark- 30
                gaugeBorderAlpha =  pluckNumber(colorObj.borderalpha,
                    FCChartObj.gaugeborderalpha, '90') * gaugeFillAlpha / 100,
                showGaugeBorder = pluckNumber(FCChartObj.showgaugeborder, 0),
                gaugeBorderThickness = showGaugeBorder ? pluckNumber(FCChartObj.gaugeborderthickness, 1) : 0,
                is3D = HCChartObj.is3D = pluckNumber(FCChartObj.is3d, 1),
                fillColor = this.getPointColor(colorObj.code, gaugeFillAlpha,
                    is3D),
                showHoverEffect = pluckNumber(FCChartObj.showhovereffect),
                gaugeFillHoverColor,
                gaugeFillHoverAlpha,
                showGaugeBorderOnHover,
                gaugeBorderHoverColor,
                gaugeBorderHoverThickness,
                gaugeBorderHoverAlpha,
                is3DOnHover,
                showHoverAnimation,
                toolText,
                hoverAttr,
                hoverAnimAttr,
                displayValue,
                isLabelString,
                gaugeBorderColor,
                hasBorderHoverMix,
                hasHoberFillMix,
                hasGaugeBorderMix,
                outAttr;

            if (colorCodeObj.isOnMeetPoint) {
                colorObj = colorCodeObj.nextObj;
            }

            HCChartObj.gaugeFillAlpha = gaugeFillAlpha;
            hasGaugeBorderMix = /\{/.test(gaugeBorderColorCode);
            gaugeBorderColorCode = hasGaugeBorderMix ? colorM.parseColorMix(pluck(colorObj.bordercolor, colorObj.code),
                gaugeBorderColorCode)[0] : gaugeBorderColorCode;
            gaugeBorderColor = convertColor(gaugeBorderColorCode, gaugeBorderAlpha);

            if (showHoverEffect !== 0 && (showHoverEffect || FCChartObj.gaugefillhovercolor ||
                    FCChartObj.plotfillhovercolor || FCChartObj.gaugefillhoveralpha ||
                        FCChartObj.plotfillhoveralpha || FCChartObj.gaugefillhoveralpha === 0 ||
                    FCChartObj.is3donhover || FCChartObj.is3donhover === 0 || FCChartObj.showgaugeborderonhover ||
                    FCChartObj.showgaugeborderonhover === 0 || FCChartObj.gaugeborderhovercolor ||
                    FCChartObj.gaugeborderhoveralpha || FCChartObj.gaugeborderhoveralpha === 0 ||
                    FCChartObj.gaugeborderhoverthickness || FCChartObj.gaugeborderhoverthickness === 0)) {
                showHoverEffect = true;
                gaugeFillHoverColor = pluck(FCChartObj.gaugefillhovercolor,
                    FCChartObj.plotfillhovercolor, FILLMIXDARK10);
                gaugeFillHoverAlpha = pluckNumber(FCChartObj.gaugefillhoveralpha, FCChartObj.plotfillhoveralpha);
                showGaugeBorderOnHover = pluckNumber(FCChartObj.showgaugeborderonhover);
                if (showGaugeBorderOnHover === undefined) {
                    if (FCChartObj.gaugeborderhovercolor || FCChartObj.gaugeborderhoveralpha ||
                            FCChartObj.gaugeborderhoveralpha === 0|| FCChartObj.gaugeborderhoverthickness ||
                            FCChartObj.gaugeborderhoverthickness === 0) {
                        showGaugeBorderOnHover = 1;
                    }
                    else {
                        showGaugeBorderOnHover = showGaugeBorder;
                    }
                }
                gaugeBorderHoverColor = pluck(FCChartObj.gaugeborderhovercolor, FILLMIXDARK10);
                gaugeBorderHoverAlpha = pluckNumber(FCChartObj.gaugeborderhoveralpha);
                gaugeBorderHoverThickness = showGaugeBorderOnHover ? pluckNumber(FCChartObj.gaugeborderhoverthickness,
                    gaugeBorderThickness || 1) : 0;
                is3DOnHover = !!pluckNumber(FCChartObj.is3donhover, is3D);
                showHoverAnimation = !!pluckNumber(FCChartObj.showhoveranimation, 1);
                hoverAttr = {};
                outAttr = {};
                if (gaugeBorderThickness !== gaugeBorderHoverThickness) {
                    hoverAttr['stroke-width'] = gaugeBorderHoverThickness;
                    outAttr['stroke-width'] = gaugeBorderThickness;
                }
//                if (gaugeFillHoverColor || gaugeFillHoverAlpha !== undefined) {
                outAttr.fill = toRaphaelColor(fillColor);
                hasHoberFillMix = /\{/.test(gaugeFillHoverColor);
                gaugeFillHoverColor = hasHoberFillMix ? colorM.parseColorMix(colorObj.code,
                    gaugeFillHoverColor)[0] : pluck(gaugeFillHoverColor, colorObj.code);
                hoverAttr.fill = toRaphaelColor(this.getPointColor(gaugeFillHoverColor,
                    pluckNumber(gaugeFillHoverAlpha, gaugeFillAlpha), is3DOnHover));
//                }
                if (gaugeBorderHoverThickness) {
                    outAttr.stroke = gaugeBorderColor;
                    hasBorderHoverMix = /\{/.test(gaugeBorderHoverColor);
                    hoverAttr.stroke = convertColor(hasBorderHoverMix ? colorM.parseColorMix(hasGaugeBorderMix ?
                        gaugeFillHoverColor : gaugeBorderColorCode, gaugeBorderHoverColor)[0] :
                        gaugeBorderHoverColor, pluckNumber(gaugeBorderHoverAlpha, gaugeBorderAlpha));
                }
            }

            //create the tooltext
            if (!this.showTooltip) {
                toolText = false;
            }
            else if (setToolText !== undefined) {
                toolText = parseTooltext(setToolText, [1,2], {
                    formattedValue: formatedVal
                }, dataObj, FCChartObj);
                isLabelString = true;
            }
            // Determine the dispalay value then
            else {
                toolText = useColorNameAsValue ? colorName : (formatedVal === null ? false :
                (label !== undefined) ? label + this.tooltipSepChar +
                formatedVal : formatedVal);
            }
            // Create the displayvalue
            if (setDisplayValue !== undefined) {
                displayValue = setDisplayValue;
            }
            // Determine the dispalay value then
            else {
                displayValue = useColorNameAsValue ? colorName : formatedVal;
            }
            // useColorNameAsValue is true we use colorName as a display
            // instead of value
            /**
             * @note will reset the displayvalue and tooltext which is provided by user
             */
           // if (useColorNameAsValue) {
           //    toolText = displayValue = colorName;
           // }

            if (this.pointValueWatcher) {
                this.pointValueWatcher(itemValue);
            }

            return {
                y: itemValue,
                displayValue : displayValue,
                toolText : toolText,
                isLabelString : isLabelString,
                colorName: colorName,
                color: fillColor,
                borderWidth: gaugeBorderThickness,
                borderColor: gaugeBorderColor,
                colorRange: colorCodeObj,
                link: dataLink,
                doNotSlice: true,
                rolloverProperties: {
                    enabled: showHoverEffect,
                    hoverAttr: hoverAttr,
                    hoverAnimAttr: hoverAnimAttr,
                    outAttr: outAttr
//                    hasBorderHoverMix: hasBorderHoverMix,
//                    hasHoberFillMix: hasHoberFillMix,
//                    gaugeFillHoverColor : gaugeFillHoverColor,
//                    gaugeFillHoverAlpha : gaugeFillHoverAlpha,
//                    gaugeBorderHoverColor : gaugeBorderHoverColor,
//                    gaugeBorderHoverAlpha : gaugeBorderHoverAlpha,
//                    is3DOnHover : is3DOnHover,
//                    showHoverAnimation: showHoverAnimation,
//                    gaugeHoverRadius : gaugeHoverRadius,
//                    gaugeBorderHoverThickness : gaugeBorderThickness === gaugeBorderHoverThickness ? undefined :
//                      gaugeBorderHoverThickness,
//                    fillColor: gaugeFillHoverColor || gaugeFillHoverAlpha !== undefined
//                      ? this.getPointColor(/\{/.test(gaugeFillHoverColor) ?
//                        colorM.parseColorMix(colorObj.code, gaugeFillHoverColor)[0] :
//                          pluck(gaugeFillHoverColor, colorObj.code),
//                        pluckNumber(gaugeFillHoverAlpha, gaugeFillAlpha), is3DOnHover)  : undefined,
//                    hoverBorderColor: gaugeBorderHoverColor || gaugeBorderHoverAlpha !== undefined ?
//                      convertColor(/\{/.test(gaugeBorderHoverColor) ?
//                        colorM.parseColorMix(gaugeBorderColor, gaugeBorderHoverColor)[0] :
//                        pluck(gaugeBorderHoverColor, gaugeBorderColor), pluckNumber(gaugeBorderHoverAlpha,
//                      gaugeBorderAlpha)) : undefined
                }
            };
        },

        spaceManager: function (hcJSON, fcJSON, width, height) {
            var iapi = this,
                smartLabel = this.smartLabel,
                series = hcJSON.series[0],
                point = series && series.data[0],
                chart = hcJSON.chart,
                //labelStyle = series.dataLabels.style,
                FCChartObj = fcJSON.chart,
                scaleFactor = chart.scaleFactor = this.scaleFactor,
                canvasWidth = width - (chart.marginRight + chart.marginLeft),
                canvasHeight = height - (chart.marginTop + chart.marginBottom),
                chartLeft = chart.marginLeft,
                chartTop = chart.marginTop,
                valuePadding = pluckNumber(FCChartObj.valuepadding, 4),
                useColorNameAsValue = chart.useColorNameAsValue,
                gaugeRadius, gaugeOriginX, gaugeOriginY,
                labelStyle,
                labelTextObj,
                titleSpace,
                maxLabelHeight,
                radiusGiven,
                valueHeight = 0,
                dataLabel;

            // Fix for Bulb gauge displayValue gets visible in real-time data
            // update
            // And also fix for the initial rendering with null value
            // We are taking min value if there in a null value in value tag.
            if (this.showValues) {
                point.y = getValidValue(point.y, hcJSON.scale.min);
                point.displayValue = getValidValue(point.displayValue,
                    this.numberFormatter.dataLabels(hcJSON.scale.min));
            }
            else {
                point.displayValue = BLANKSTRING;
            }
            dataLabel = point.displayValue;

            //Gauge origin X, Y
            chart.gaugeOriginX = pluckNumber(FCChartObj.gaugeoriginx,
                FCChartObj.bulboriginx, -1);
            chart.gaugeOriginY = pluckNumber(FCChartObj.gaugeoriginy,
                FCChartObj.bulboriginy, -1);
            chart.gaugeRadius = pluckNumber(FCChartObj.gaugeradius, FCChartObj.bulbradius, -1);

            radiusGiven = chart.gaugeRadius !== -1;

            // Place the the Caption first
            canvasHeight -= titleSpace = iapi.titleSpaceManager(hcJSON, fcJSON, canvasWidth, canvasHeight * 0.3);
            chartTop += titleSpace;

            // Take the maximum height that label can use
            maxLabelHeight = (canvasHeight * 0.7) - valuePadding;


            // Setting the style for of the Label in series
            chart.dataLabels = {
                style: hcJSON.plotOptions.series.dataLabels.style
            };
            labelStyle = chart.dataLabels.style;

            // Set the smartLabel Style
            smartLabel.setStyle(labelStyle);

            if (chart.placeValuesInside == 1) {
                // Take the maximum available sapace for the Bulb
                gaugeRadius = radiusGiven ? chart.gaugeRadius * scaleFactor : Math.min(canvasWidth, canvasHeight) / 2;

                // Calculate largest available space for the Label text inside the Bulb
                maxLabelHeight = Math.sqrt(mathPow(gaugeRadius * 2, 2) / 2);

                // Wrapping the first label to the whole drawing widht
                labelTextObj = smartLabel.getSmartText(dataLabel, maxLabelHeight, maxLabelHeight);
            }
            else {
                maxLabelHeight = (radiusGiven ? canvasHeight - (chart.gaugeRadius * 2) * scaleFactor :
                    (canvasHeight * 0.7)) - valuePadding;

                // Wrapping the first label to the whole drawing widht
                labelTextObj = smartLabel.getSmartText(dataLabel, canvasWidth, maxLabelHeight);
                valueHeight = labelTextObj.height + valuePadding;

                // Calculate radius based on margins and whether we've to show value outside
                gaugeRadius = (Math.min(canvasWidth, canvasHeight - valueHeight)) / 2;
            }

            if (useColorNameAsValue) {
                point.displayValue = labelTextObj.text;
                labelTextObj.tooltext && (point.originalText = labelTextObj.tooltext);
            }


            chart.valuePadding = valuePadding;
            chart.valueTextHeight = labelTextObj.height;
            chart.labelLineHeight = parseInt(labelStyle.lineHeight, 10);

            //Calculate our default origin X & Y
            gaugeOriginX = chartLeft + (canvasWidth / 2);
            gaugeOriginY = chartTop + (canvasHeight - valueHeight) / 2;

            gaugeRadius = radiusGiven ? (chart.gaugeRadius * scaleFactor) : gaugeRadius;
            gaugeOriginX = (chart.gaugeOriginX === -1) ? gaugeOriginX : (chart.gaugeOriginX * scaleFactor);
            gaugeOriginY = (chart.gaugeOriginY === -1) ? gaugeOriginY : (chart.gaugeOriginY * scaleFactor);

            chart.marginTop = chart.marginLeft = 0;
            chart.gaugeRadius = gaugeRadius;
            chart.gaugeOriginX = gaugeOriginX;
            chart.gaugeOriginY = gaugeOriginY;

        },

        updateSnapPoints: function (hc) {
            chartAPI.gaugebase.updateSnapPoints.apply(this, arguments);

            var chartOptions = hc.chart,
            snaps = this.snapLiterals;

            snaps.gaugeradius = chartOptions.gaugeRadius;
        }

    }, chartAPI.gaugebase);

    /* Drawingpad Charts */
    chartAPI('drawingpad', {
        friendlyName: 'DrawingPad Component',
        standaloneInit: true,
        defaultSeriesType : 'drawingpad',
        rendererId: 'drawingpad',
        defaultPlotShadow: 1,
        drawAnnotations: true,
        chartleftmargin: 0,
        charttopmargin: 0,
        chartrightmargin: 0,
        chartbottommargin: 0,

        chart: function () {
            extend2(this.dataObj.chart, {
                bgcolor: this.dataObj.chart.bgcolor || '#ffffff',
                bgalpha: this.dataObj.chart.bgalpha || '100'
            });
            var baseObj = this.base.chart.apply(this, arguments);

            return baseObj;
        },

        series : function () {
            extend2(this.hcJSON, {
                legend: {
                    enabled: false
                },
                chart: {
                    plotBackgroundColor: COLOR_TRANSPARENT,
                    plotBorderColor: COLOR_TRANSPARENT
                },
                series: [{
                    data : []
                }]
            });
        },

        spaceManager: function () { },
        creditLabel: creditLabel
    }, chartAPI.bulb);


    /* Funnel Charts */
    chartAPI('funnel', {
        friendlyName: 'Funnel Chart',
        standaloneInit: true,
        defaultSeriesType : 'funnel',
        sliceOnLegendClick: true,
        defaultPlotShadow: 1,
        subTitleFontSizeExtender: 0,
        tooltippadding: 3,
        drawAnnotations: true,
        isDataLabelBold : false,
        formatnumberscale: 1,
        rendererId: 'funnel',
        alignCaptionWithCanvas: 0,

        defaultPaletteOptions : extend(extend2({}, defaultGaugePaletteOptions), {
            //Store colors now
            paletteColors: lib.defaultPaletteOptions.paletteColors
        }),

        preSeriesAddition : function (HCObj, fcObj) {
            var FCChartObj = fcObj.chart,
            colorM = this.colorManager,
            dataLebelsOptions = HCObj.plotOptions.series.dataLabels;

            dataLebelsOptions.connectorWidth = pluckNumber(FCChartObj.smartlinethickness, 1);
            dataLebelsOptions.connectorColor = convertColor(pluck(FCChartObj.smartlinecolor,
                colorM.getColor('baseFontColor')),
                pluckNumber(FCChartObj.smartlinealpha, 100));

            //enable the legend for the pie
            if (pluckNumber(FCChartObj.showlegend, 0)) {
                HCObj.legend.enabled = true;
                HCObj.legend.reversed =
                !Boolean(pluckNumber(FCChartObj.reverselegend , 0));
            }
            else {
                HCObj.legend.enabled = false;
            }
            HCObj.plotOptions.series.point.events.legendItemClick = FCChartObj.interactivelegend ===
            ZEROSTRING ? falseFN : function () {
                this.slice();
            };
        },

        series : function (FCObj, HCObj, chartName) {
            if (FCObj.data && FCObj.data.length > 0) {
                var series = {
                    data : [],
                    // for single series the color will be added point by point from palette
                    colorByPoint: true,
                    showInLegend: true
                }, seriesArr;




                //add data using chart speciffic function
                seriesArr = this.point(chartName, series, FCObj.data, FCObj.chart, HCObj);
                if (seriesArr) {
                    HCObj.series.push(seriesArr);
                }


            }
        },

        // Function to parse hover effect attribute for Funnel and Pyramid
        pointHoverOptions: function (dataObj, FCChartObj, pointCosmetics) {
            var hoverEffect = pluckNumber(dataObj.showhovereffect, FCChartObj.showhovereffect),
                hoverEffects = {
                    enabled: hoverEffect
                },
                rolloverProperties = {},
                highlightColors,
                colorLen,
                index;

            // Detect whether any of the hover effect attributes are explicitly set or not
            // Enable hover effect when any of the hover attributes are explicitly set
            if (hoverEffect === UNDEFINED) {
                hoverEffect = hoverEffects.enabled = pluck(dataObj.hovercolor,
                    FCChartObj.plotfillhovercolor, dataObj.hoveralpha, FCChartObj.plotfillhoveralpha,
                    dataObj.borderhovercolor, FCChartObj.plotborderhovercolor,
                    dataObj.borderhoverthickness, FCChartObj.plotborderhoverthickness,
                    dataObj.borderhoveralpha, FCChartObj.plotborderhoveralpha) !== UNDEFINED;
            }

            if (hoverEffect) {
                // Parse hover attributes
                hoverEffects.highlight = pluckNumber(dataObj.highlightonhover,
                    FCChartObj.highlightonhover);
                hoverEffects.color = pluck(dataObj.hovercolor,
                    FCChartObj.plotfillhovercolor);
                hoverEffects.alpha = pluck(dataObj.hoveralpha,
                    FCChartObj.plotfillhoveralpha, pointCosmetics.alpha);
                hoverEffects.borderColor = pluck(dataObj.borderhovercolor,
                    FCChartObj.plotborderhovercolor, pointCosmetics.borderColor);
                hoverEffects.borderThickness = pluckNumber(dataObj.borderhoverthickness,
                    FCChartObj.plotborderhoverthickness, pointCosmetics.borderWidth);
                hoverEffects.borderAlpha = pluck(dataObj.borderhoveralpha,
                    FCChartObj.plotborderhoveralpha, pointCosmetics.borderAlpha);

                // If hover effect is enabled but no hover color is provided, just highlight the default color
                if (hoverEffects.highlight !== 0  && hoverEffects.color === undefined) {
                    hoverEffects.highlight = 1;
                }

                hoverEffects.color = pluck(hoverEffects.color, pointCosmetics.color).replace(/,+?$/, BLANK);

                if (hoverEffects.highlight === 1) {
                    highlightColors = hoverEffects.color.split(/\s{0,},\s{0,}/);

                    colorLen = highlightColors.length;

                    for (index = 0; index < colorLen; index += 1) {
                        highlightColors[index] = getLightColor(highlightColors[index], 70);
                    }
                    hoverEffects.color = highlightColors.join(',');
                }

                rolloverProperties = {
                    color: hoverEffects.color,
                    alpha: hoverEffects.alpha,
                    borderColor: convertColor(hoverEffects.borderColor,
                        hoverEffects.borderAlpha),
                    borderWidth: hoverEffects.borderThickness
                };
            }

            return {
                enabled: hoverEffect,
                options: hoverEffects,
                rolloverOptions: rolloverProperties
            };
        },

        point : function (chartName, series, data, FCChartObj, HCObj) {
            var conf = HCObj[CONFIGKEY],
                sumValue = 0,
                displayValueText = BLANK,
                filteredData = [],
                // thickness of pie slice border
                setBorderWidth = pluck(FCChartObj.plotborderthickness , ONESTRING),
                // Flag to decide, whether we show pie label, tolltext and values
                labelsEnabled = true,
                hasValidPoint = false,
                percentOfPrevValue = BLANK,
                HCChartObj = HCObj.chart,
                isPyramid = this.isPyramid,
                showPercentInToolTip = pluckNumber(FCChartObj.showpercentintooltip, 1),
                showLabels = pluckNumber(FCChartObj.showlabels, 1),
                showValues = pluckNumber(FCChartObj.showvalues, 1),
                showPercentValues = pluckNumber(FCChartObj.showpercentvalues, FCChartObj.showpercentagevalues, 0),
                toolTipSepChar = pluck(FCChartObj.tooltipsepchar, FCChartObj.hovercapsepchar, COMMASPACE),
                labelSepChar = pluck(FCChartObj.labelsepchar, toolTipSepChar),
                piebordercolor = pluck(FCChartObj.plotbordercolor, FCChartObj.piebordercolor),
                smartLabel = this.smartLabel,
                NumberFormatter = this.numberFormatter,
                length = data.length,
                smartTextObj, labelMaxWidth = 0,
                colorM = this.colorManager,
                isSliced = HCChartObj.issliced = pluckNumber(FCChartObj.issliced, 0),
                noOFSlicedElement = 0,
                valInLeg = pluckNumber(FCChartObj.showvalueinlegend, 0),
                labelInLeg = pluckNumber(FCChartObj.showlabelinlegend, 1),
                valBefore = pluckNumber(FCChartObj.valuebeforelabelinlegend, 0),
                valAsPerInLeg = pluckNumber(FCChartObj.showvalueaspercentinlegend, 1),
                sepChar = pluck(FCChartObj.legendsepchar, ', '),
                pointShadow = {
                    apply: FCChartObj.showshadow == ONESTRING,
                    opacity: 1
                },
                name,
                index,
                dataValue,
                dataObj,
                setColor,
                setAlpha,
                setPlotBorderColor,
                setPlotBorderAlpha,
                labelText,
                toolText,
                pValue,
                formatedVal,
                TTValue,
                displayValue,
                yScale, sum,
                percentOfPrevious,
                prevValue,
                streamlinedData,
                colorIndex,
                hcDataObj,
                pointSliced,
                totalValue,
                legValue,
                legendText,
                countPoint,
                itemValue,
                highestValue,
                hoverEffects;

            series.isPyramid = isPyramid;
            streamlinedData = series.streamlinedData = pluckNumber(FCChartObj.streamlineddata, 1);
            series.is2d = pluckNumber(FCChartObj.is2d, 0);
            series.isHollow = pluckNumber(FCChartObj.ishollow, streamlinedData ? 1 : 0);
            percentOfPrevious = pluckNumber(FCChartObj.percentofprevious, 0);
            yScale = pluckNumber(this.isPyramid ? FCChartObj.pyramidyscale : FCChartObj.funnelyscale);

            series.labelDistance = Math.abs(pluckNumber(FCChartObj.labeldistance, FCChartObj.nametbdistance, 50));
            series.showLabelsAtCenter = pluckNumber(FCChartObj.showlabelsatcenter, 0);
            if (yScale >= 0 && yScale <= 40) {
                series.yScale = yScale / 200;
            }
            else {
                series.yScale = 0.2;
            }

            // If both the labels and the values are disable then disable the datalabels
            if (!showLabels && !showValues) {
                HCObj.plotOptions.series.dataLabels.enabled = false;

                // If labels, values and tooltex are disabled then don't need to calculate
                // labels and tooltext
                if (HCObj.tooltip.enabled === false) {
                    labelsEnabled = false;
                }
            }

            series.useSameSlantAngle = pluckNumber(FCChartObj.usesameslantangle, streamlinedData ? 0 : 1);



            for (index = 0, countPoint = 0; index < length; index += 1) {
                dataObj = data[index];
                // vLine
                if (data[index].vline) {
                    continue;
                }
                dataObj.cleanValue = itemValue = NumberFormatter.getCleanValue(dataObj.value, true);
                //if valid data then only add the point
                if (itemValue !== null) {
                    hasValidPoint = true;
                    highestValue = highestValue || itemValue;
                    filteredData.push(dataObj);
                    sumValue += itemValue;
                    countPoint += 1;
                    highestValue = Math.max(highestValue, itemValue);
                }
            }

            if (hasValidPoint) {
                series.valueSum = sumValue;
                sum = NumberFormatter.dataLabels(sumValue);
                length = filteredData.length;

                if (!isPyramid && streamlinedData) {
                    // sort the data
                    filteredData.sort(function (a, b) {
                        return b.cleanValue - a.cleanValue ;
                    });
                }

                //add the sum data for funnel streamlinedData ='0'
                if (!isPyramid && !streamlinedData) {
                    // Finally insert the value and other point cosmetics in the series.data array
                    series.data.push({
                        showInLegend: false, // prevent legend item when no label
                        y: sumValue,
                        name: '',
                        shadow: pointShadow,
                        smartTextObj: smartTextObj,
                        color: setColor,
                        alpha: setAlpha,
                        borderColor: convertColor(setPlotBorderColor,
                            setPlotBorderAlpha),
                        borderWidth: setBorderWidth,
                        link : getValidValue(dataObj.link),
                        // Fix for the issue IE showing undefined label when streamlinedData='0'
                        displayValue: BLANKSTRING,
                        doNotSlice: (pluckNumber(FCChartObj.enableslicing, 1) === 0)
                    });
                }

                for (index = 0; index < filteredData.length; index += 1) {
                    // numberFormatter.getCleanValue(dataObj.value, true);
                    // individual data obj
                    // for further manipulation
                    dataObj = filteredData[index];

                    // Taking the value
                    // we multiply the value with 1 to convert it to integer
                    dataValue = dataObj.cleanValue;
                    prevValue = index ? filteredData[index - 1].value : dataValue;


                    // Label provided with data point
                    name = parseUnsafeString(pluck(dataObj.label, dataObj.name, BLANKSTRING));

                    smartTextObj = smartLabel.getOriSize(name);

                    // parsing slice cosmetics attribute supplied in data points
                    // Color for each slice
                    colorIndex = index && !isPyramid && streamlinedData ? index - 1 : index;
                    setColor = pluck(dataObj.color, colorM.getPlotColor(colorIndex));
                    // Alpha for each slice
                    setAlpha = pluck(dataObj.alpha, FCChartObj.plotfillalpha, HUNDREDSTRING);
                    // each slice border color
                    setPlotBorderColor = pluck(dataObj.bordercolor, piebordercolor, getLightColor(setColor, 25)).
                    split(COMMASTRING)[0];
                    // each slice border alpha
                    setPlotBorderAlpha = FCChartObj.showplotborder != 1 ?
                    ZEROSTRING : pluck(dataObj.borderalpha, FCChartObj.plotborderalpha,
                        FCChartObj.pieborderalpha, '80');


                    // Used to set alpha of the shadow
                    pointShadow.opacity = Math.max(setAlpha, setPlotBorderAlpha) / 100;

                    pointSliced = pluckNumber(dataObj.issliced, isSliced);
                    if (pointSliced) {
                        noOFSlicedElement += 1;
                        conf.preSliced = pointSliced;
                    }

                    totalValue = isPyramid || !streamlinedData ? sumValue :
                        (percentOfPrevious ? prevValue : highestValue);

                    // Adding label, tooltext, and display value
                    if(labelsEnabled) {
                        pValue = NumberFormatter.percentValue(dataValue / totalValue * 100);
                        formatedVal = NumberFormatter.dataLabels(dataValue) || BLANKSTRING;

                        labelText = showLabels === 1 ? name : BLANKSTRING;
                        displayValueText = pluckNumber(dataObj.showvalue, showValues) === 1 ?
                        (showPercentValues === 1 ? pValue : formatedVal ) : BLANKSTRING;
                        displayValue = getValidValue(parseUnsafeString(dataObj.displayvalue));
                        if (displayValue) {
                            displayValueText = displayValue;
                        } else {
                            //create the datalabel str
                            if (displayValueText !== BLANKSTRING && labelText !== BLANKSTRING) {
                                displayValueText = labelText + labelSepChar + displayValueText;
                            }
                            else {
                                displayValueText = pluck(labelText, displayValueText) || BLANKSTRING;
                            }
                        }
                        if (streamlinedData){
                            percentOfPrevValue  = percentOfPrevious ? pValue :
                            NumberFormatter.percentValue(dataValue / prevValue * 100);
                        }

                        //create the Tooltext
                        toolText = getValidValue(parseUnsafeString(pluck(dataObj.tooltext, conf.tooltext)));
                        if (toolText !== undefined) {
                            toolText = parseTooltext(toolText, [1,2,3,7,14,24,25,37], {
                                formattedValue: formatedVal,
                                label: name,
                                percentValue : percentOfPrevious ?
                                    NumberFormatter.percentValue(dataValue / highestValue * 100) : pValue,
                                sum: sum,
                                unformattedSum: sumValue,
                                percentOfPrevValue: percentOfPrevValue
                            }, dataObj, FCChartObj);
                        }
                        else {
                            TTValue = showPercentInToolTip === 1 ? pValue : formatedVal;
                            toolText = name !== BLANKSTRING ? name + toolTipSepChar + TTValue : TTValue;
                        }
                    }

                    legendText = labelInLeg ? name : BLANKSTRING;
                    if (valInLeg) {
                        legValue = valAsPerInLeg ?
                            NumberFormatter.legendPercentValue(dataValue /
                                totalValue * 100) :
                            NumberFormatter.legendValue(dataValue);
                        legendText = valBefore ? legValue +
                            (legendText && sepChar + legendText) :
                            (legendText && legendText + sepChar) + legValue;
                    }


                    hoverEffects = this.pointHoverOptions(dataObj, FCChartObj, {
                        color: setColor,
                        alpha: setAlpha,
                        borderColor: setPlotBorderColor,
                        borderAlpha: setPlotBorderAlpha,
                        borderWidth: setBorderWidth
                    });

                    hcDataObj = {
                        displayValue: displayValueText,
                        categoryLabel: name,
                        toolText: toolText,
                        showInLegend: (legendText !== BLANKSTRING), // prevent legend item when no label
                        y: dataValue,
                        name: legendText,
                        shadow: pointShadow,
                        smartTextObj: smartTextObj,
                        color: setColor,
                        alpha: setAlpha,
                        borderColor: convertColor(setPlotBorderColor,
                            setPlotBorderAlpha),
                        borderWidth: setBorderWidth,
                        link : getValidValue(dataObj.link),
                        isSliced : pointSliced,
                        doNotSlice: (pluckNumber(FCChartObj.enableslicing, 1) === 0),
                        tooltipConstraint : this.tooltipConstraint,
                        hoverEffects: hoverEffects.enabled && hoverEffects.options,
                        rolloverProperties: hoverEffects.enabled && hoverEffects.rolloverOptions
                    };

                    if (!index && !isPyramid && streamlinedData) {
                        hcDataObj.showInLegend = false;
                    }

                    series.data.push(hcDataObj);


                }

                //blank chart for all 0 data
                if (!sumValue) {
                    series.data = [];
                }

                series.labelMaxWidth = labelMaxWidth;
                series.noOFSlicedElement = noOFSlicedElement;
                return series;
            }
            else {
                return null;
            }
        },

        spaceManager: function (hcJSON, fcJSON, width, height) {
            var iapi = this,
            smartLabel = this.smartLabel,
            fcJSONChart = fcJSON.chart,
            hcJSONChart = hcJSON.chart,
            legendPos = pluck(fcJSONChart.legendposition, POSITION_BOTTOM).toLowerCase(),
            chartWorkingWidth = width - (hcJSONChart.marginRight + hcJSONChart.marginLeft),
            chartWorkingHeight = height - (hcJSONChart.marginTop + hcJSONChart.marginBottom),
            isPyramid = this.isPyramid,
            labelMaxW = 0,
            labelOverlappingW = 0,
            slicingHeight,
            canvasHeight,
            canvasMaxWidth,
            SlicingDistance,
            series = hcJSON.series[0],
            tempSnap,
            currentValue,
            extraSpace,
            chartDrawingWidth,
            currentDiameter,
            newDiameter,
            lowestRadiusFactor,
            ratioK,
            dataArr,
            length,
            i,
            point,
            smartTextObj, labelMaxWidth,
            totalValue,
            blankSpace,
            labelDistance,
            showLabelsAtCenter,
            minWidthForChart,
            drawingWillExtend,
            maxWidthForLabel,
            labelStyle,
            lineHeight,
            labelMaxUsedWidth,
            hasPoint,
            maxValue,
            maxNoLabelCanDraw,
            sumValues,
            upperRadiusFactor,
            valueRadiusIncrementRatio,
            useSameSlantAngle,
            nonStreamlinedData;




            if (series) {

                //for anotation macrows store temp conf
                tempSnap = this._tempSnap = {
                    top3DSpace : 0,
                    bottom3DSpace : 0,
                    topLabelSpace : 0,
                    rightLabelSpace : 0
                };

                //if the legend is at the right then place it and deduct the width
                //if at bottom calculate the space for legend after the vertical axis placed
                if (hcJSON.legend.enabled){
                    if(legendPos === POSITION_RIGHT) {
                        chartWorkingWidth -= this.placeLegendBlockRight(hcJSON, fcJSON,
                            chartWorkingWidth / 2, chartWorkingHeight, true);
                    }
                    else {
                        chartWorkingHeight -= this.placeLegendBlockBottom(hcJSON, fcJSON,
                            chartWorkingWidth, chartWorkingHeight / 2, true);
                    }
                }
                SlicingDistance = chartWorkingHeight * 0.1;
                slicingHeight = pluckNumber(fcJSONChart.slicingdistance, SlicingDistance);
                if (slicingHeight > 2 * SlicingDistance) {//space beyond management
                    SlicingDistance = 0;
                }
                else {
                    SlicingDistance = slicingHeight;
                }

                canvasHeight = chartWorkingHeight - SlicingDistance;
                //Note: actualu much less then original canWidth
                canvasMaxWidth = Math.min(2 * canvasHeight, chartWorkingWidth);

                hcJSONChart.marginTop += SlicingDistance / 2;
                hcJSONChart.marginBottom += SlicingDistance / 2;
                series.SlicingDistance = slicingHeight;



                // Find the label maximun width
                dataArr = series.data;
                length = dataArr.length;
                i = isPyramid? 0 : 1;
                blankSpace = 3;
                labelDistance = series.labelDistance + blankSpace;
                showLabelsAtCenter = series.showLabelsAtCenter;

                minWidthForChart = Math.min(canvasMaxWidth, chartWorkingWidth * 0.3);
                drawingWillExtend = chartWorkingWidth - minWidthForChart;
                maxWidthForLabel = chartWorkingWidth - minWidthForChart - labelDistance;
                labelStyle = hcJSON.plotOptions.series.dataLabels.style;
                lineHeight = pluckNumber(mathCeil(parseFloat(labelStyle.lineHeight) +
                    labelStyle.borderPadding + labelStyle.borderThickness), 10);
                labelMaxUsedWidth = 0;
                hasPoint = dataArr[0];
                maxValue = hasPoint && dataArr[0].y ? dataArr[0].y : 1;
                //maxNoLabelCanDraw;
                sumValues = series.valueSum ? series.valueSum : 1;
                upperRadiusFactor = isPyramid ? 0 : 1;

                valueRadiusIncrementRatio = 0.8 / maxValue;
                useSameSlantAngle = series.useSameSlantAngle == 1;
                nonStreamlinedData = !isPyramid && !series.streamlinedData;
                smartLabel.setStyle(labelStyle);

                maxNoLabelCanDraw = chartWorkingHeight / (lineHeight * 1 + 4);

                totalValue = nonStreamlinedData ? (dataArr[0].y - dataArr[1].y) : 0;

                // Wrapping the first label to the whole drawing widht
                if (!isPyramid && hasPoint && dataArr[0].displayValue) {
                    smartTextObj = smartLabel.getSmartText(dataArr[0].displayValue, chartWorkingWidth, lineHeight);
                    dataArr[0].displayValue = smartTextObj.text;
                    smartTextObj.tooltext && (dataArr[0].originalText = smartTextObj.tooltext);
                    dataArr[0].labelWidht = smartLabel.getOriSize(smartTextObj.text).width;
                    // Reducing the chart height to place the top most label
                    hcJSONChart.marginTop += tempSnap.topLabelSpace = lineHeight + 4;
                }


                for(;i < length; i += 1) {
                    point = dataArr[i];
                    currentValue = point.y;
                    if (showLabelsAtCenter) {
                        smartTextObj = smartLabel.getSmartText(point.displayValue, chartWorkingWidth, lineHeight);

                    } else {
                        if (isPyramid) {
                            currentValue = totalValue + (point.y / 2);
                            ratioK = currentValue ? currentValue / sumValues : 1;
                        }
                        else {
                            ratioK = nonStreamlinedData ? 0.2 + (valueRadiusIncrementRatio * totalValue) :
                            (point.y ? (useSameSlantAngle ? point.y / maxValue : Math.sqrt(point.y / maxValue)) :
                             1);
                        }

                        currentDiameter = minWidthForChart * ratioK;
                        labelMaxWidth = maxWidthForLabel + ((minWidthForChart - currentDiameter) / 2);
                        smartTextObj = smartLabel.getSmartText(point.displayValue, labelMaxWidth, lineHeight);
                        point.displayValue = smartTextObj.text;
                        smartTextObj.tooltext && (point.originalText = smartTextObj.tooltext);
                        labelMaxUsedWidth = Math.max(labelMaxUsedWidth, smartTextObj.width);
                        if (drawingWillExtend > 0) {
                            if (smartTextObj.width > 0) {
                                extraSpace = labelMaxWidth - smartTextObj.width;
                            }
                            else {
                                extraSpace = labelMaxWidth +  labelDistance;
                            }
                            newDiameter =  (1 / (ratioK + 1)) * (currentDiameter + 2 * extraSpace + minWidthForChart);

                            drawingWillExtend = Math.min(drawingWillExtend, newDiameter - minWidthForChart);
                        }
                        totalValue += nonStreamlinedData ? -(dataArr[i + 1] && dataArr[i + 1].y || 0) : point.y;
                    }
                }
                if (point) {
                    lowestRadiusFactor = isPyramid ? 1 : (nonStreamlinedData ? 0.2 :
                        (point.y ? (useSameSlantAngle ? point.y / maxValue : Math.sqrt(point.y / maxValue)) : 1));
                }
                chartDrawingWidth = minWidthForChart + drawingWillExtend;
                if (chartDrawingWidth > canvasMaxWidth) {
                    chartDrawingWidth = canvasMaxWidth;
                }

                totalValue = nonStreamlinedData ? dataArr[0].y - dataArr[1].y : 0;

                // Now we have the actual drawing width for the funnel and pyramid
                // Reiterate through the data and find the max label width
                if (!showLabelsAtCenter) {
                    for (i = isPyramid ? 0 : 1, length = dataArr.length; i < length; i += 1) {
                        point = dataArr[i];
                        currentValue = point.y;
                        if (isPyramid) {
                            currentValue = totalValue + (point.y / 2);
                            ratioK = currentValue ? currentValue / sumValues : 1;
                        }
                        else {
                            ratioK = nonStreamlinedData ? 0.2 + (valueRadiusIncrementRatio * totalValue) :
                            (point.y ? (useSameSlantAngle ? point.y / maxValue : mathSqrt(point.y / maxValue)) :
                             1);
                        }
                        currentDiameter = chartDrawingWidth * ratioK;
                        labelMaxWidth = maxWidthForLabel + ((minWidthForChart - currentDiameter) / 2);
                        smartTextObj = smartLabel.getSmartText(point.displayValue, labelMaxWidth, lineHeight);
                        labelMaxW = mathMax(labelMaxW, (currentDiameter * 0.5) +
                            smartTextObj.width + labelDistance);
                        totalValue += nonStreamlinedData ? -(dataArr[i + 1] && dataArr[i + 1].y || 0) : point.y;
                    }
                }

                if (labelMaxUsedWidth > 0) {
                    tempSnap.rightLabelSpace = (chartWorkingWidth - chartDrawingWidth);
                    // Keep the chart at center and find extra space required to place the label
                    labelOverlappingW = labelMaxW - (width * 0.5 - hcJSONChart.marginRight);
                    if (labelOverlappingW > 0) {
                        // Adjust the extra space required to place the label
                        hcJSONChart.marginRight += labelOverlappingW;
                        hcJSONChart.marginLeft -= labelOverlappingW;
                    }
                    hcJSONChart.marginRight += tempSnap.rightLabelSpace * 0.5;
                    hcJSONChart.marginLeft += tempSnap.rightLabelSpace * 0.5;
                    chartWorkingWidth -= hcJSON.title.alignWithCanvas ? tempSnap.rightLabelSpace : 0;
                }
                else {
                    labelDistance = 0;
                }

                series.labelDistance = series.connectorWidth = labelDistance;
                //now the place the chart at the center
                /*  extraSpace = chartWorkingWidth - labelMaxUsedWidth - chartDrawingWidth;
                if (extraSpace > 0) {
                    //devide the extra space on booth the side
                    hcJSON.chart.marginRight += extraSpace / 2;
                    hcJSON.chart.marginLeft += extraSpace / 2;
                }*/
                chartWorkingHeight -= iapi.titleSpaceManager(hcJSON, fcJSON, chartWorkingWidth,
                    chartWorkingHeight / 2);

                if ((showLabelsAtCenter || !labelMaxUsedWidth) && canvasMaxWidth < chartWorkingWidth) {
                    hcJSONChart.marginLeft += (chartWorkingWidth - canvasMaxWidth - labelDistance) * 0.5;
                    hcJSONChart.marginRight += (chartWorkingWidth - canvasMaxWidth - labelDistance) * 0.5;
                }

                if (!series.is2d) {
                    hcJSONChart.marginTop += tempSnap.top3DSpace =
                        (chartDrawingWidth * series.yScale * upperRadiusFactor) / 2;
                    hcJSONChart.marginBottom += tempSnap.bottom3DSpace =
                        (chartDrawingWidth * series.yScale * lowestRadiusFactor) / 2;
                }
            }
        },

        updateSnapPoints: function() {
            chartAPI.gaugebase.updateSnapPoints.apply(this, arguments);

            var snaps = this.snapLiterals,
            adjSnaps = this._tempSnap || {};


            // Fix plotHeight to include all parts of drawing
            snaps.plotwidth = snaps.canvaswidth;
            snaps.plotsemiwidth = snaps.canvaswidth / 2;
            snaps.plotheight = snaps.canvasheight + adjSnaps.top3DSpace +
                adjSnaps.bottom3DSpace;

            // Add plot positions.
            snaps.plotstartx = snaps.canvasstartx;
            snaps.plotstarty = snaps.canvasstarty - adjSnaps.top3DSpace;
            snaps.plotendx = snaps.canvasendx;
            snaps.plotendy = snaps.canvasendy + adjSnaps.bottom3DSpace;

            // Make canvas-width include data-label space
            snaps.canvaswidth = snaps.canvaswidth + adjSnaps.rightLabelSpace;

            // Adjust canvas height to include extra labels on y-axis
            snaps.canvasheight = snaps.plotheight + adjSnaps.topLabelSpace;

            // Reposition canvas on axis.
            snaps.canvasstarty = snaps.plotstarty - adjSnaps.topLabelSpace;
            snaps.canvasendy = snaps.plotendy;
            snaps.canvasendx = snaps.canvasendx + adjSnaps.rightLabelSpace;

        },

        eiMethods: {
            // jsdoc for this item is already in pie base.
            sliceDataItem: function (index) {
                var vars = this.jsVars,
                hcObj = vars.hcObj,
                series;

                if (hcObj && hcObj.series &&
                    (series = hcObj.series[0]) && series.data &&
                    series.data[index] && series.data[index].slice) {

                    return series.data[series.xIncrement - 1 - index].slice();
                }
            }
        },

        useSortedData: true,
        creditLabel : creditLabel
    }, chartAPI.gaugebase);


    /* Pyramid Charts */
    chartAPI('pyramid', {
        friendlyName: 'Pyramid Chart',
        subTitleFontSizeExtender: 0,
        drawAnnotations: true,
        standaloneInit: true,
        defaultSeriesType : 'pyramid',
        defaultPlotShadow: 1,
        useSortedData: false,
        isPyramid : 1,
        creditLabel: creditLabel,
        rendererId: 'pyramid'
    }, chartAPI.funnel);



    /* SparkBase Charts */
    chartAPI('sparkbase', {
        defaultPlotShadow: 0,
        useSortedData: false,
        subTitleFontSizeExtender: 0,
        subTitleFontWeight: 0,
        drawAnnotations: true,
        showYAxisValues: 0,
        numdivlines: 0,
        chartrightmargin: 3,
        chartleftmargin: 3,
        charttopmargin: 3,
        chartbottommargin: 3,
        decimals: 2,
        showTrendlineLabel: 0,
        zeroplanethickness: 0,
        tooltippadding: 1,
        useScaleRecursively: true,
        showTrendlineLabels: 0,
        showAxisLimitGridLines: 0,

        // Borrow style definition from gauge base
        /* jshint camelcase: false*/
        styleApplicationDefinition_font: chartAPI.gaugebase.styleApplicationDefinition_font,
        /* jshint camelcase: true*/

        defaultPaletteOptions : extend(extend2({}, defaultGaugePaletteOptions), {
            //Store colors now
            paletteColors: [['555555', 'A6A6A6', 'CCCCCC', 'E1E1E1', 'F0F0F0'],
            ['A7AA95', 'C4C6B7', 'DEDFD7', 'F2F2EE'],
            ['04C2E3', '66E7FD', '9CEFFE', 'CEF8FF'],
            ['FA9101', 'FEB654', 'FED7A0', 'FFEDD5'],
            ['FF2B60', 'FF6C92', 'FFB9CB', 'FFE8EE']],
            //Store other colors
            // ------------- For 2D Chart ---------------//
            //We're storing 5 combinations, as we've 5 defined palettes.
            bgColor: ['FFFFFF', 'CFD4BE,F3F5DD', 'C5DADD,EDFBFE', 'A86402,FDC16D', 'FF7CA0,FFD1DD'],
            bgAngle: [270, 270, 270, 270, 270],
            bgRatio: ['0,100', '0,100', '0,100', '0,100', '0,100'],
            bgAlpha: ['100', '60,50', '40,20', '20,10', '30,30'],

            canvasBgColor: ['FFFFFF', 'FFFFFF', 'FFFFFF', 'FFFFFF', 'FFFFFF'],
            canvasBgAngle: [0, 0, 0, 0, 0],
            canvasBgAlpha: ['100', '100', '100', '100', '100'],
            canvasBgRatio: ['', '', '', '', ''],
            canvasBorderColor: ['BCBCBC', 'BEC5A7', '93ADBF', 'C97901', 'FF97B1'],

            toolTipBgColor: ['FFFFFF', 'FFFFFF', 'FFFFFF', 'FFFFFF', 'FFFFFF'],
            toolTipBorderColor: ['545454', '545454', '415D6F', '845001', '68001B'],
            baseFontColor: ['333333', '60634E', '025B6A', 'A15E01', '68001B'],
            trendColor: ['666666', '60634E', '415D6F', '845001', '68001B'],
            plotFillColor: ['666666', 'A5AE84', '93ADBF', 'C97901', 'FF97B1'],
            borderColor: ['767575', '545454', '415D6F', '845001', '68001B'],
            borderAlpha: [50, 50, 50, 50, 50],
            periodColor: ['EEEEEE', 'ECEEE6', 'E6ECF0', 'FFF4E6', 'FFF2F5'],

            //Colors for win loss chart
            winColor: ['666666', '60634E', '025B6A', 'A15E01', 'FF97B1'],
            lossColor: ['CC0000', 'CC0000', 'CC0000', 'CC0000', 'CC0000'],
            drawColor: ['666666', 'A5AE84', '93ADBF', 'C97901', 'FF97B1'],
            scorelessColor: ['FF0000', 'FF0000', 'FF0000', 'FF0000', 'FF0000']
        }),

        preSeriesAddition: function(hc, obj) {
            var style = hc.plotOptions.series.dataLabels.style,
                HCChartObj = hc.chart,
                FCChartObj = obj.chart,
                css = {
                    fontFamily: style.fontFamily,
                    fontSize: style.fontSize,
                    lineHeight: style.lineHeight,
                    fontWeight: style.fontWeight,
                    fontStyle: style.fontStyle
                },
                data,
                winLossValueMap,
                length,
                dataObj,
                openColor,
                closeColor;

            if (this.name == 'sparkwinloss') {
                data = obj.data || (obj.dataset && obj.dataset[0] && obj.dataset[0].data);
                winLossValueMap = {
                    w: 1,
                    l: -1,
                    d: 0.1
                };

                if ((length = data && data.length) > 0) {
                    while (length) {
                        length -= 1;
                        dataObj = data[length];
                        dataObj.value = winLossValueMap[dataObj.value.toLowerCase()];
                    }
                }
            }

            HCChartObj.borderWidth = pluckNumber(FCChartObj.showborder, this.showBorder, 0) ?
                pluckNumber(FCChartObj.borderthickness, 1) : 0;

            HCChartObj.plotBorderWidth = pluckNumber(FCChartObj.canvasborderthickness, 1);

            //Fill Color for high, low, open and close (SparkLine Charts)
            openColor = HCChartObj.openColor = parseColor(pluck(FCChartObj.opencolor, '0099FF'));
            closeColor = HCChartObj.closeColor = parseColor(pluck(FCChartObj.closecolor, '0099FF'));
            HCChartObj.highColor = parseColor(pluck(FCChartObj.highcolor, '00CC00')),
            HCChartObj.lowColor = parseColor(pluck(FCChartObj.lowcolor, 'CC0000'));

            HCChartObj.openHoverColor = convertColor(parseColor(pluck(FCChartObj.openhovercolor,
                FCChartObj.anchorhovercolor, FCChartObj.plotfillhovercolor, getLightColor(openColor, 70))),
                    pluckNumber(FCChartObj.openhoveralpha, FCChartObj.anchorhoveralpha,
                    FCChartObj.plotfillhoveralpha, 100));
            HCChartObj.closeHoverColor = convertColor(parseColor(pluck(FCChartObj.closehovercolor,
                FCChartObj.anchorhovercolor, FCChartObj.plotfillhovercolor, getLightColor(closeColor, 70))),
                pluckNumber(FCChartObj.closehoveralpha, FCChartObj.anchorhoveralpha,
                    FCChartObj.plotfillhoveralpha, 100));
            HCChartObj.highHoverColor = convertColor(parseColor(pluck(FCChartObj.highhovercolor,
                FCChartObj.anchorhovercolor, FCChartObj.plotfillhovercolor, getLightColor(HCChartObj.highColor, 70))),
                pluckNumber(FCChartObj.highhoveralpha, FCChartObj.anchorhoveralpha,
                    FCChartObj.plotfillhoveralpha, 100));
            HCChartObj.lowHoverColor = convertColor(parseColor(pluck(FCChartObj.lowhovercolor,
                FCChartObj.anchorhovercolor, FCChartObj.plotfillhovercolor, getLightColor(HCChartObj.lowColor, 70))),
                pluckNumber(FCChartObj.lowhoveralpha, FCChartObj.anchorhoveralpha, FCChartObj.plotfillhoveralpha, 100));

            // forceHoverEnable to enable hover effect forcefully if any of the
            // following attributes is being used
            this.forceHoverEnable = pluck(FCChartObj.openhovercolor,
                FCChartObj.closehovercolor, FCChartObj.highhovercolor,
                FCChartObj.lowhovercolor, FCChartObj.openhoveralpha,
                FCChartObj.closehoveralpha, FCChartObj.highhoveralpha,
                FCChartObj.lowhoveralpha, FCChartObj.winhovercolor, FCChartObj.losshovercolor,
                    FCChartObj.drawhovercolor, FCChartObj.scorelesshovercolor);

            hc.chart.openValue = {
                style: extend2({}, css)
            };
            setLineHeight(hc.chart.openValue.style);
            hc.chart.openValue.style.color = openColor;
            hc.chart.closeValue = {
                style: extend2({}, css)
            };
            setLineHeight(hc.chart.openValue.style);
            hc.chart.closeValue.style.color = closeColor;
            hc.chart.highLowValue = {
                style: extend2({}, css)
            };

            //////set styles//////////
            this.parseStyles(hc);

            if (this.showCanvas === 0) {
                HCChartObj.plotBackgroundColor = COLOR_TRANSPARENT;
            }
            if (!this.showCanvasBorder) {
                // Manage canvas cosmetics
                HCChartObj.plotBorderWidth = 0;
            }
            if (!HCChartObj.useRoundEdges) {
                HCChartObj.plotShadow = 0;
            }

            FCChartObj.zeroplanethickness = pluck(FCChartObj.zeroplanethickness, this.zeroplanethickness);

            // Spark charts do not support axis names. As such, axis name space management is not done. Hence it should
            // not be parsed. Since the parser is common, we are deleting source of the axis names before parsing begin.
            delete FCChartObj.yaxisname;
            delete FCChartObj.xaxisname;

            FCChartObj.showlabels = pluck(FCChartObj.showlabels, ZEROSTRING);
        },

        spaceManager: function (hcJSON, fcJSON, width, height) {
            var conf = hcJSON[CONFIGKEY],
                smartLabel = this.smartLabel || conf.smartLabel,
                FCChartObj = fcJSON.chart,
                series = hcJSON.series[0],
                chart = hcJSON.chart,
                canvasWidth = width - (chart.marginRight + chart.marginLeft),
                captionWidth,
                canvasLeftMargin = pluckNumber(FCChartObj.canvasleftmargin),
                canvasRightMargin = pluckNumber(FCChartObj.canvasrightmargin),
                valuePadding = hcJSON.valuePadding = pluckNumber(FCChartObj.valuepadding, 2),
                dataLabels = hcJSON.plotOptions.series.dataLabels,
                style = dataLabels.style,
                labelLineHeight = parseInt(style.lineHeight, 10),
                maxCaptionWidth = canvasWidth * 0.70,
                sparkLineLabelsMaxWidth = canvasWidth,
                labelsMaxWidth = 0,
                leftLabel = 0, rightLabel = 0,
                openValueObj,
                closeValueObj,
                highLowValueObj,
                openValueWidth,
                closeValueWidth,
                highLowValueWidth,
                xAxis,
                xMin,
                xMax,
                i,
                periodLength,
                periodColor,
                flag,
                iapi = this;


            if (series) {
                // Caption Space Management
                // Palce the Caption and subCaption on left or right hand side of the Gauge.
                captionWidth = placeTitleOnSide(hcJSON, fcJSON, maxCaptionWidth, height,
                    undefined, width, height, iapi);
                sparkLineLabelsMaxWidth -= (captionWidth.left + captionWidth.right);
                canvasWidth = width - (chart.marginRight + chart.marginLeft);

                openValueWidth = 0;
                closeValueWidth = 0;
                highLowValueWidth = 0;
                // openValue
                smartLabel.setStyle(style);
                if (defined(chart.openValue.label)) {
                    smartLabel.setStyle(chart.openValue.style);
                    labelLineHeight = pluckNumber(parseInt(chart.openValue.style.lineHeight, 10), 10);
                    openValueObj = smartLabel.getSmartText(chart.openValue.label,
                        sparkLineLabelsMaxWidth, labelLineHeight * 1.5);
                    if (openValueObj.width > 0) {
                        leftLabel = openValueWidth = openValueObj.width + valuePadding;
                        labelsMaxWidth += openValueWidth;
                        sparkLineLabelsMaxWidth -= openValueWidth;
                    }
                }
                // closeValue
                if (defined(chart.closeValue.label)) {
                    smartLabel.setStyle(chart.closeValue.style);
                    labelLineHeight = pluckNumber(parseInt(chart.closeValue.style.lineHeight, 10), 10);
                    closeValueObj = smartLabel.getSmartText(chart.closeValue.label,
                        sparkLineLabelsMaxWidth, labelLineHeight * 1.5);
                    if (closeValueObj.width > 0) {
                        rightLabel = closeValueWidth = closeValueObj.width + valuePadding;
                        labelsMaxWidth += closeValueWidth;
                        sparkLineLabelsMaxWidth -= closeValueWidth;
                    }
                }
                // highLowValue
                if (defined(chart.highLowValue.label)) {
                    smartLabel.setStyle(chart.highLowValue.style);
                    labelLineHeight = pluckNumber(parseInt(chart.highLowValue.style.lineHeight, 10), 10);
                    highLowValueObj = smartLabel.getSmartText(chart.highLowValue.label,
                        sparkLineLabelsMaxWidth, labelLineHeight * 1.5);
                    if (highLowValueObj.width > 0) {
                        rightLabel += highLowValueWidth = highLowValueObj.width + valuePadding;
                        labelsMaxWidth += highLowValueWidth;
                        sparkLineLabelsMaxWidth -= highLowValueWidth;
                    }
                }

                chart.marginRight += highLowValueWidth + closeValueWidth;
                chart.marginLeft += openValueWidth;

                //Before doing so, we take into consideration, user's forced canvas margins (if any defined)
                if (defined(canvasLeftMargin)) {
                    chart.spacingLeft = chart.marginLeft = canvasLeftMargin;
                    chart.spacingLeft -= captionWidth.left + openValueWidth;
                } else {
                    chart.marginLeft += captionWidth.left;
                }
                if (defined(canvasRightMargin)) {
                    chart.spacingRight = chart.marginRight = canvasRightMargin;
                    chart.spacingRight -= captionWidth.right + highLowValueWidth + closeValueWidth;
                } else {
                    chart.marginRight += captionWidth.right;
                }
                this.xAxisMinMaxSetter(hcJSON, fcJSON, canvasWidth);

                xAxis = hcJSON.xAxis;
                xMin = xAxis.min;
                xMax = xAxis.max;
                periodLength = pluckNumber(FCChartObj.periodlength, 0);
                periodColor = convertColor(pluck(FCChartObj.periodcolor, this.colorManager.getColor('periodColor')),
                    pluckNumber(FCChartObj.periodalpha, 100));
                flag = 1;

                if (periodLength > 0) {
                    for (i = xMin; i <= xMax; i += periodLength) {
                        if (flag) {
                            xAxis.plotBands.push({
                                color: periodColor,
                                from:  i,
                                to: Math.min(xMax, i + periodLength),
                                zIndex: 1
                            });
                            flag = 0;
                        } else {
                            flag = 1;
                        }
                    }
                }

                fixCaptionAlignment(hcJSON, fcJSON, width, leftLabel, rightLabel, iapi);

            }
        }
    }, singleSeriesAPI);


    chartAPI('sparkline', {
        friendlyName: 'Spark Line Chart',
        standaloneInit: true,
        defaultSeriesType : 'line',
        rendererId: 'sparkline',
        creditLabel: creditLabel,
        showtooltip: 0,
        showCanvas: 0,
        point: chartAPI.linebase.point,
        lineThickness: 1,
        anchorRadius: 2,
        anchorBorderThickness: 0,

        postSeriesAddition: function(hc, obj) {
            var HCChartObj = hc.chart,
                FCChartObj = obj.chart,
                // Initialize Color Manager for Widgets
                colorM = this.colorManager,
                series = hc.series && hc.series[0],
                hcDataArr = series && hc.series[0].data,
                index, length, fcDataArr, dataObj, fcDataObj,
                highValue = this.highValue,
                lowValue = this.lowValue,
                NumberFormatter = this.numberFormatter,

                //Fill and hover fill Color for high, low, open and close
                openColor = HCChartObj.openColor,//parseColor(pluck(FCChartObj.opencolor, '0099FF')),
                closeColor = HCChartObj.closeColor,//parseColor(pluck(FCChartObj.closecolor, '0099FF')),
                highColor = HCChartObj.highColor,//parseColor(pluck(FCChartObj.highcolor, '00CC00')),
                lowColor = HCChartObj.lowColor,//parseColor(pluck(FCChartObj.lowcolor, 'CC0000')),
                openHoverColor = HCChartObj.openHoverColor,
                closeHoverColor = HCChartObj.closeHoverColor,
                highHoverColor = HCChartObj.highHoverColor,
                lowHoverColor = HCChartObj.lowHoverColor,
                anchorHoverColor,
                hoverEffects,
                rolloverProperties,
                anchorColor = parseColor(pluck(FCChartObj.anchorcolor, colorM.getColor('plotFillColor'))),
                //Whether to show anchors for open, close, high & low
                showOpenAnchor =
                    pluckNumber(FCChartObj.showopenanchor, FCChartObj.drawanchors, FCChartObj.showanchors, 1),
                showCloseAnchor = pluckNumber(FCChartObj.showcloseanchor, FCChartObj.drawanchors,
                    FCChartObj.showanchors, 1),
                showHighAnchor =
                    pluckNumber(FCChartObj.showhighanchor, FCChartObj.drawanchors, FCChartObj.showanchors, 1),
                showLowAnchor =
                    pluckNumber(FCChartObj.showlowanchor, FCChartObj.drawanchors, FCChartObj.showanchors, 1),
                anchorAlpha = pluckNumber(FCChartObj.anchoralpha, 100),
                pointAnchorAlpha,
                showAnchors = pluckNumber(FCChartObj.drawanchors, FCChartObj.showanchors, 0),
                anchorHoverRadius,
                defAnchorAlpha = showAnchors ? pluckNumber(FCChartObj.anchoralpha, 100) : 0,
                highDisplayValue, lowDisplayValue, openDisplayValue, closeDisplayValue,
                hasValidValue = 0,
                lineColor = pluck(FCChartObj.linecolor, colorM.getColor('plotFillColor')),
                lineAlpha = pluckNumber(FCChartObj.linealpha, 100),
                // openValue
                openValue,
                // closeValue
                closeValue;


            if ((length = index = hcDataArr && hcDataArr.length) > 0) {
                fcDataArr = obj.data || (obj.dataset && obj.dataset[0] && obj.dataset[0].data);
                // set the line color and alpha to
                // HC seris obj with FusionCharts color format using FCcolor obj
                series.color = convertColor(lineColor, lineAlpha);
                // openValue
                openValue = hcDataArr[0] && hcDataArr[0].y || BLANK;
                // closeValue
                closeValue = hcDataArr[length - 1] && hcDataArr[length - 1].y || BLANK;

                while (index) {
                    index -= 1;
                    dataObj = hcDataArr[index];
                    fcDataObj = fcDataArr[index];

                    anchorColor = anchorHoverColor = UNDEFINED;
                    pointAnchorAlpha = pluckNumber(dataObj.anchorbgalpha, anchorAlpha);

                    dataObj.color = convertColor(pluck(fcDataObj.color, lineColor),
                        pluckNumber(fcDataObj.alpha, lineAlpha));
                    dataObj.marker.fillColor = convertColor(pluck(dataObj.anchorbgcolor, anchorColor),
                            pluckNumber(dataObj.anchorbgalpha, defAnchorAlpha));

                    anchorHoverColor = convertColor(parseColor(pluck(FCChartObj.anchorhovercolor,
                        FCChartObj.plotfillhovercolor, getLightColor(lineColor, 70))), pluckNumber(
                        FCChartObj.lowhoveralpha, FCChartObj.anchorhoveralpha, FCChartObj.plotfillhoveralpha, 100));
                    anchorHoverRadius = pluckNumber(FCChartObj.anchorhoverradius,
                        dataObj.marker.radius);

                    // Disable marker where not required
                    // This prevents hover trouble
                    dataObj.marker.enabled = !!showAnchors;

                    if (dataObj.y == lowValue) {
                        anchorColor = pluck(dataObj.anchorbgcolor, lowColor);
                        dataObj.marker.fillColor = convertColor(anchorColor, pointAnchorAlpha);
                        anchorHoverColor = lowHoverColor;
                        dataObj.marker.enabled = !!showLowAnchor;
                        lowDisplayValue = NumberFormatter.dataLabels(dataObj.y);
                    }

                    if (dataObj.y == highValue) {
                        anchorColor = pluck(dataObj.anchorbgcolor, highColor);
                        dataObj.marker.fillColor = convertColor(anchorColor, pointAnchorAlpha);
                        anchorHoverColor = highHoverColor;
                        dataObj.marker.enabled = !!showHighAnchor;
                        highDisplayValue = NumberFormatter.dataLabels(dataObj.y);
                    }

                    //create the tooltext for high, low, open and close value only
                    if (dataObj.toolText !== undefined) {
                        dataObj.toolText = parseTooltext(dataObj.toolText,
                        [54, 55, 56, 57, 58, 59, 60, 61], {
                            openDataValue: NumberFormatter.dataLabels(openValue),
                            closeDataValue: NumberFormatter.dataLabels(closeValue),
                            highDataValue: NumberFormatter.dataLabels(highValue),
                            lowDataValue: NumberFormatter.dataLabels(lowValue),
                            openValue: openValue,
                            closeValue: closeValue,
                            highValue: highValue,
                            lowValue: lowValue
                        }, {}, FCChartObj);
                    }

                    if (!pluckNumber(fcDataObj.showvalue, FCChartObj.showvalue, FCChartObj.showvalues, 0)) {
                        dataObj.displayValue = BLANKSTRING;
                    }
                    if(defined(dataObj.y)) {
                        hasValidValue = 1;
                    }

                    // Apply appropriate hover efffects
                    hoverEffects = dataObj.hoverEffects;
                    if (dataObj.marker.enabled && hoverEffects)  {
                        hoverEffects.anchorColor = anchorHoverColor;
                        rolloverProperties = dataObj.rolloverProperties;
                        rolloverProperties.radius = pluckNumber(FCChartObj.anchorhoverradius,
                            dataObj.marker.radius);
                        rolloverProperties.lineWidth = 0;
                        rolloverProperties.lineColor =
                            rolloverProperties.fillColor = anchorHoverColor;
                    }

                }
                // openValue
                dataObj = hcDataArr[0];
                dataObj.marker.fillColor = convertColor(pluck(dataObj.anchorbgcolor, openColor), pointAnchorAlpha);
                dataObj.marker.enabled = !!showOpenAnchor;

                // Apply appropriate hover efffects on openValue
                hoverEffects = dataObj.hoverEffects;
                if (dataObj.marker.enabled && hoverEffects)  {
                    hoverEffects.anchorColor = openHoverColor;
                    rolloverProperties = dataObj.rolloverProperties;
                    rolloverProperties.radius = pluckNumber(FCChartObj.anchorhoverradius,
                        dataObj.marker.radius);
                    rolloverProperties.lineWidth = 0;
                    rolloverProperties.lineColor =
                            rolloverProperties.fillColor = openHoverColor;
                }

                openDisplayValue = NumberFormatter.dataLabels(dataObj.y);
                // openValue is the lowValue
                if (dataObj.y == lowValue && showLowAnchor) {
                    dataObj.marker.fillColor = convertColor(pluck(dataObj.anchorbgcolor, lowColor), pointAnchorAlpha);
                    dataObj.marker.enabled = !!showLowAnchor;
                }
                // openValue is the highValue
                if (dataObj.y == highValue && showHighAnchor) {
                    dataObj.marker.fillColor = convertColor(pluck(dataObj.anchorbgcolor, highColor), pointAnchorAlpha);
                    dataObj.marker.enabled = !!showHighAnchor;
                }

                // closeValue
                dataObj = hcDataArr[length - 1];
                dataObj.marker.fillColor = convertColor(pluck(dataObj.anchorbgcolor, closeColor), pointAnchorAlpha);
                dataObj.marker.enabled = !!showCloseAnchor;

                // Apply appropriate hover efffects on openValue
                hoverEffects = dataObj.hoverEffects;
                if (dataObj.marker.enabled && hoverEffects) {
                    hoverEffects.anchorColor = closeHoverColor;
                    rolloverProperties = dataObj.rolloverProperties;
                    rolloverProperties.radius = pluckNumber(FCChartObj.anchorhoverradius,
                        dataObj.marker.radius);
                    rolloverProperties.lineWidth = 0;
                    rolloverProperties.lineColor =
                            rolloverProperties.fillColor = closeHoverColor;
                }


                closeDisplayValue = NumberFormatter.dataLabels(dataObj.y);
                // closeValue is the lowValue
                if (dataObj.y == lowValue && showLowAnchor) {
                    dataObj.marker.fillColor = convertColor(pluck(dataObj.anchorbgcolor, lowColor), pointAnchorAlpha);
                    dataObj.marker.enabled = !!showLowAnchor;
                }
                // closeValue is the highValue
                if (dataObj.y == highValue && showHighAnchor) {
                    dataObj.marker.fillColor = convertColor(pluck(dataObj.anchorbgcolor, highColor), pointAnchorAlpha);
                    dataObj.marker.enabled = !!showHighAnchor;
                }

                HCChartObj.openValue.label = HCChartObj.closeValue.label = HCChartObj.highLowValue.label = BLANKSTRING;
                if (hasValidValue) {
                    HCChartObj.openValue.label = pluckNumber(FCChartObj.showopenvalue, 1) ?
                        openDisplayValue : BLANKSTRING;
                    HCChartObj.closeValue.label = pluckNumber(FCChartObj.showclosevalue, 1) ?
                        closeDisplayValue : BLANKSTRING;

                    HCChartObj.highLowValue.label = pluckNumber(FCChartObj.showhighlowvalue, 1) ?
                    '[' +
                    '<span style="color: '+ highColor +'">' + highDisplayValue + '</span>' +
                    '<span>|</span>' +
                    '<span style="color: '+ lowColor +'">' + lowDisplayValue + '</span>' +
                    ']'
                    : BLANKSTRING;
                }
            }
        }

    },  chartAPI.sparkbase);


    chartAPI('sparkcolumn', {
        friendlyName: 'Spark Column Chart',
        standaloneInit: true,
        rendererId: 'cartesian',
        defaultSeriesType : 'column',
        creditLabel: creditLabel,
        showCanvasBorder: true,
        point: chartAPI.column2dbase.point,
        useFlatColor: true,

        postSeriesAddition: function(hc, obj) {
            var FCChartObj = obj.chart,
                // Initialize Color Manager for Widgets
                colorM = this.colorManager,
                hcDataArr = hc.series && hc.series[0] && hc.series[0].data,
                length,
                dataObj,
                fcDataArr,
                fcDataObj,
                colorArr,
                highValue = this.highValue,
                lowValue = this.lowValue,
                NumberFormatter = this.numberFormatter,

                plotFillAlpha = pluck(FCChartObj.plotfillalpha, HUNDREDSTRING),
                plotFillColor = pluck(FCChartObj.plotfillcolor, colorM.getColor('plotFillColor')),
                plotBorderAlpha = pluck(FCChartObj.plotborderalpha, HUNDREDSTRING),
                plotBorderColor = pluck(FCChartObj.plotbordercolor),

                hoverEffects,
                rolloverProperties,

                //Fill Color for high column and low column
                highColor = pluck(FCChartObj.highcolor, '000000'),
                lowColor = pluck(FCChartObj.lowcolor, '000000'),
                highBorderColor = pluck(FCChartObj.highbordercolor, plotBorderColor),
                lowBorderColor = pluck(FCChartObj.lowbordercolor, plotBorderColor),
                plotBorderThickness = pluckNumber(FCChartObj.showplotborder, 0) ?
                        pluckNumber(FCChartObj.plotborderthickness, 1) : 0,
                setColor,
                setAlpha,
                bdColor,
                bdAlpha,
                setRatio,
                setAngle;

            if ((length = hcDataArr && hcDataArr.length) > 0) {
                fcDataArr = obj.data || (obj.dataset && obj.dataset[0] && obj.dataset[0].data);

                while (length) {
                    length -= 1;
                    dataObj = hcDataArr[length];
                    fcDataObj = fcDataArr[length];
                    // Filtering color for SparkColumn
                    setColor = pluck(fcDataObj.color, plotFillColor);
                    setAlpha = pluck(fcDataObj.alpha, plotFillAlpha);
                    bdColor = pluck(fcDataObj.bordercolor, plotBorderColor);
                    bdAlpha = pluck(fcDataObj.borderalpha, plotBorderAlpha);
                    // Fill ratio of the data
                    setRatio = pluck(fcDataObj.ratio, FCChartObj.plotfillratio);
                    // defaultAngle depend upon item value
                    setAngle = pluck(360 - FCChartObj.plotfillangle, 90);

                    if (dataObj.y == highValue) {
                        setColor = pluck(fcDataObj.color, highColor);
                        bdColor = pluck(fcDataObj.bordercolor, highBorderColor);

                        hoverEffects = dataObj.hoverEffects;
                        if (hoverEffects)  {
                            hoverEffects.color = pluck(fcDataObj.hovercolor, FCChartObj.highhovercolor,
                                FCChartObj.plotfillhovercolor, getLightColor(setColor, 70));

                            hoverEffects.borderColor = pluck(
                                    fcDataObj.borderhovercolor,
                                    FCChartObj.highborderhovercolor,
                                    FCChartObj.plotborderhovercolor,
                                    bdColor);

                            hoverEffects.colorArr = colorArr =
                                this.getColumnColor(fcDataObj, hoverEffects.color,
                                pluck(fcDataObj.hoveralpha, FCChartObj.highhoveralpha,
                                FCChartObj.plotfillhoveralpha, setAlpha),
                                hoverEffects.borderColor, bdAlpha, setRatio, setAngle, hc.chart.useRoundEdges);

                            rolloverProperties = dataObj.rolloverProperties;
                            rolloverProperties.color = colorArr[0];
                            rolloverProperties.borderColor = colorArr[1];

                        }
                    }
                    if (dataObj.y == lowValue) {
                        setColor = pluck(fcDataObj.color, lowColor);
                        bdColor = pluck(fcDataObj.bordercolor, lowBorderColor);
                        hoverEffects = dataObj.hoverEffects;
                        if (hoverEffects)  {
                            hoverEffects.color = pluck(fcDataObj.hovercolor,FCChartObj.lowhovercolor,
                                FCChartObj.plotfillhovercolor, getLightColor(setColor, 70));

                            hoverEffects.borderColor = pluck(fcDataObj.borderhovercolor,
                                    FCChartObj.lowborderhovercolor, FCChartObj.plotborderhovercolor, bdColor);

                            hoverEffects.colorArr = colorArr = this.getColumnColor(fcDataObj,
                                dataObj.hoverEffects.color, pluck(fcDataObj.hoveralpha, FCChartObj.lowhoveralpha,
                                FCChartObj.plotfillhoveralpha, setAlpha), dataObj.hoverEffects.borderColor,
                                bdAlpha, setRatio, setAngle, hc.chart.useRoundEdges);

                            rolloverProperties = dataObj.rolloverProperties;
                            rolloverProperties.color = colorArr[0];
                            rolloverProperties.borderColor = colorArr[1];

                        }
                    }

                    //create the tooltext for highValue and lowValue only
                    if (dataObj.toolText !== undefined) {
                        dataObj.toolText = parseTooltext(dataObj.toolText, [56, 57, 60, 61], {
                            highValue: highValue,
                            lowValue: lowValue,
                            highDataValue: NumberFormatter.dataLabels(highValue),
                            lowDataValue: NumberFormatter.dataLabels(lowValue)
                        }, {}, FCChartObj);
                    }

                    colorArr = this.getColumnColor(fcDataObj, setColor,
                        setAlpha, bdColor, bdAlpha, setRatio,
                        setAngle, hc.chart.useRoundEdges);

                    dataObj.color = colorArr[0];
                    dataObj.borderColor = colorArr[1];
                    dataObj.borderWidth = plotBorderThickness;
                    if (!pluckNumber(fcDataObj.showvalue, FCChartObj.showvalue,
                        FCChartObj.showvalues, 0)) {
                        dataObj.displayValue = BLANKSTRING;
                    }
                }
            }
        },

        //this function create the column color depending upon the configuration
        getColumnColor: function (fcDataObj, setColor, setAlpha, bdColor, bdAlpha, ratio, angle,
            isRoundEdges, isBar, is3d) {
            var bgColor, borderColor, colorArr, alphaArr, bdColorArr, color, alpha, bdAlphaArr;

            bdColor = pluck(bdColor, getDarkColor(setColor, 60));

            colorArr = setColor.split(COMMASTRING);
            alphaArr = setAlpha.split(COMMASTRING);
            bdColorArr = bdColor.split(COMMASTRING);
            bdAlphaArr = bdAlpha.split(COMMASTRING);
            if (is3d) {
                bgColor = {
                    FCcolor: {
                        color: colorArr[0],
                        alpha: alphaArr[0]
                    }
                };
            }
            else if (isRoundEdges) {
                color = colorArr[0];
                alpha = alphaArr[0];
                bgColor = {
                    FCcolor: {
                        color: getDarkColor(color, 75) + COMMASTRING + getLightColor(color, 25) + COMMASTRING +
                        getDarkColor(color, 80) + COMMASTRING + getLightColor(color, 65) +
                            COMMASTRING + getDarkColor(color, 80),
                        alpha: alpha + COMMASTRING + alpha + COMMASTRING + alpha +
                        COMMASTRING + alpha + COMMASTRING + alpha,
                        ratio: '0,10,13,57,20',
                        angle: isBar ? '-180' : '0'
                    }
                };
                bdColorArr = [getDarkColor(color, 70)];
            }
            else {
                setAlpha = parseAlpha(setAlpha, colorArr.length);
                bgColor = {
                    FCcolor: {
                        color: setColor,
                        alpha: setAlpha,
                        ratio: ratio,
                        angle: isBar ? 180 - angle : angle
                    }
                };

            }
            borderColor = {
                FCcolor: {
                    color: bdColorArr[0],
                    alpha: bdAlphaArr[0]
                }
            };
            return [bgColor, borderColor];
        }
    },  chartAPI.sparkbase);


    chartAPI('sparkwinloss', {
        friendlyName: 'Spark Win-Loss Chart',
        standaloneInit: true,
        defaultSeriesType : 'column',
        rendererId: 'sparkwinloss',
        creditLabel: creditLabel,
        showCanvasBorder: false,
        showCanvas: 0,
        showtooltip: 0,

        postSeriesAddition: function(hc, obj) {
            var HCChartObj = hc.chart,
            FCChartObj = obj.chart,
            // Initialize Color Manager for Widgets
            colorM = this.colorManager,
            hcDataArr = hc.series && hc.series[0] && hc.series[0].data,
            plotFillAlpha = pluck(FCChartObj.plotfillalpha, HUNDREDSTRING),
            plotFillColor = pluck(FCChartObj.plotfillcolor, colorM.getColor('plotFillColor')),
            plotBorderAlpha = pluck(FCChartObj.plotborderalpha, HUNDREDSTRING),
            plotBorderColor = pluck(FCChartObj.plotbordercolor),
            //Fill Color for high column and low column
            plotBorderThickness = pluckNumber(FCChartObj.showplotborder, 0) ?
                pluckNumber(FCChartObj.plotborderthickness, 1) : 0,
            winColor = pluck(FCChartObj.wincolor, colorM.getColor('winColor')),
            lossColor = pluck(FCChartObj.losscolor, colorM.getColor('lossColor')),
            drawColor = pluck(FCChartObj.drawcolor, colorM.getColor('drawColor')),
            scorelessColor = pluck(FCChartObj.scorelesscolor, colorM.getColor('scorelessColor')),

            winHoverColor = FCChartObj.winhovercolor,
            lossHoverColor = FCChartObj.losshovercolor,
            drawHoverColor = FCChartObj.drawhovercolor,
            scoreLessHoverColor = FCChartObj.scorelesshovercolor,

            setColor = BLANKSTRING, hoverColor, setAlpha, bdColor, bdAlpha, setRatio, setAngle,
            numWon = 0, numLost = 0, numDraw = 0,
            yAxis = hc.yAxis[0],

            rolloverProperties,
            hoverEffects,
            colorArr,
            length,
            dataObj,
            fcDataArr,
            fcDataObj;

            // Disable the tooltip of sparkWinLoss
            hc.tooltip.enabled = false;
            // setting yAxis min/max value forcefully
            // fix for the issue #FWXT-766
            yAxis.min = -1.1;
            yAxis.max = 1.1;

            if ((length = hcDataArr && hcDataArr.length) > 0) {
                fcDataArr = obj.data || (obj.dataset && obj.dataset[0] && obj.dataset[0].data);

                while (length) {
                    length -= 1;
                    dataObj = hcDataArr[length];
                    fcDataObj = fcDataArr[length];

                    switch(fcDataObj.value) {
                        case 1:
                            setColor = pluck(fcDataObj.color, winColor, plotFillColor);
                            hoverColor = pluck(fcDataObj.hovercolor, winHoverColor, setColor);
                            numWon += 1;
                            break;
                        case -1:
                            setColor = pluck(fcDataObj.color, lossColor, plotFillColor);
                            hoverColor = pluck(fcDataObj.hovercolor, lossHoverColor, setColor);
                            numLost += 1;
                            break;
                        case 0.1:
                            setColor = pluck(fcDataObj.color, drawColor, plotFillColor);
                            hoverColor = pluck(fcDataObj.hovercolor, drawHoverColor, setColor);
                            numDraw += 1;
                            break;
                    }
                    if (fcDataObj.scoreless == 1) {
                        setColor = pluck(fcDataObj.color, scorelessColor, plotFillColor);
                        hoverColor = pluck(fcDataObj.hovercolor, scoreLessHoverColor,
                            fcDataObj.color, scorelessColor, hoverColor);
                    }

                    // Filtering color for SparkColumn
                    //setColor = pluck(fcDataObj.color, pointColorMap[fcDataObj.scoreless == 1 ||
                        //dataObj.y], plotFillColor);
                    setAlpha = pluck(fcDataObj.alpha, plotFillAlpha);
                    bdColor = pluck(fcDataObj.bordercolor, plotBorderColor);
                    bdAlpha = pluck(fcDataObj.borderalpha, plotBorderAlpha);
                    // Fill ratio of the data
                    setRatio = pluck(fcDataObj.ratio, FCChartObj.plotfillratio);
                    // defaultAngle depend upon item value
                    setAngle = pluck(360 - FCChartObj.plotfillangle, 90);

                    colorArr = this.getColumnColor(fcDataObj, setColor,
                        setAlpha, bdColor, bdAlpha, setRatio,
                        setAngle, hc.chart.useRoundEdges);

                    dataObj.color = colorArr[0];
                    dataObj.borderColor = colorArr[1];
                    dataObj.borderWidth = plotBorderThickness;
                    if (!pluckNumber(fcDataObj.showvalue, 0)) {
                        dataObj.displayValue = BLANKSTRING;
                    }

                    hoverEffects = dataObj.hoverEffects;
                    if (hoverEffects)  {
                        rolloverProperties = dataObj.rolloverProperties;
                        hoverEffects.color = getLightColor(hoverColor, 70);
                        colorArr = hoverEffects.colorArr = this.getColumnColor(fcDataObj,
                            hoverEffects.color,
                        setAlpha, bdColor, bdAlpha, setRatio,
                        setAngle, hc.chart.useRoundEdges);

                        rolloverProperties.color = colorArr[0];
                        rolloverProperties.borderColor = colorArr[1];
                        hoverEffects.borderThickness = plotBorderThickness;
                        rolloverProperties.borderWidth = plotBorderThickness;
                    }


                }
                if (pluckNumber(FCChartObj.showvalue, 1) == 1) {
                    HCChartObj.closeValue.style = extend2({}, hc.plotOptions.series.dataLabels.style);
                    HCChartObj.closeValue.label = numWon + '-' + numLost + ((numDraw > 0) ?
                        ('-' + numDraw) : BLANKSTRING);
                }
            }
        }
    },  chartAPI.sparkcolumn);



    /*****************************************************************/
    /*****                   Real Time Charts                    *****/
    /*****************************************************************/



    function yAxisLabelAdjuster (yaxis, plotElemArr) {
        var labelObj = yaxis.labels,
        textY = labelObj._textY,
        righttX = labelObj._righttX,
        leftX = labelObj._leftX,
        i,
        label,
        ln = plotElemArr.length;

        for (i = 0; i < ln; i += 1) {
            label = plotElemArr[i] && plotElemArr[i].label;
            if (label) {
                label.y = textY;
                label.x = label.align === POSITION_RIGHT? righttX : leftX;
            }

        }
    }

    realTimeExtension = {
        realtimeEnabled: true,
        canvasPaddingModifiers: null,
        linearDataParser: chartAPI.gaugebase.linearDataParser,
        eiMethods: extend({}, chartAPI.gaugebase.eiMethods),
        decimals: 2,

        prepareRealtimeValueText: function () {
            var iapi = this,
                hcJSON = iapi.hcJSON,
                optionsChart = hcJSON.chart,
                conf = iapi.hcJSON[CONFIGKEY],
                rtLabel = conf.rtLabel,
                rtValueSep = optionsChart.realtimeValueSeparator,
                regx = new RegExp(rtValueSep + '$', 'g'),
                text;

            //update the text of realtime value
            if (rtLabel && rtLabel.label){
                text = conf.realtimeValues.join(rtValueSep).replace(regx, BLANK);
                rtLabel.label.text = text;
                hcJSON.xAxis.plotLines && (hcJSON.xAxis.plotLines[0] = rtLabel);
            }
        },

        chart: function () {
            var iapi = this,
                fcChartOptions = iapi.dataObj.chart,
                numberFormatter = iapi.numberFormatter,
                hcObj,
                conf,
                optionsChart,
                showRTValue = pluckNumber(fcChartOptions.showrealtimevalue, 1),
                rtvPadding = pluckNumber(fcChartOptions.realtimevaluepadding),
                rtvBreak,
                series,
                serie,
                data,
                value,
                style,
                RTFontSize,
                i,
                l;

            fcChartOptions = iapi.dataObj.chart;
            fcChartOptions.adjustdiv = '0';
            if (showRTValue) {
                rtvBreak = '<br/>';
                fcChartOptions.xaxisname = fcChartOptions.xaxisname ? rtvBreak +
                fcChartOptions.xaxisname : rtvBreak;
            }
            //iapi.numDisplaySets = pluckNumber(fcChartOptions.numdisplaysets, 15),
            hcObj = chartAPI.msareabase.chart.apply(this, arguments);

            optionsChart = hcObj.chart;
            conf = hcObj[CONFIGKEY];
            series = hcObj.series;

            // Storing the original yaxis limits specified by the user in the conf
            // so that we can reference them while recalculating the new min and
            // max of the y axis. More specifically, if the calculated max is less than
            // the user specified max then preference is given to the userMax and
            // not the calculated max. Similarly for min.
            if (conf.isDual) {
                conf._userPMin = pluckNumber(fcChartOptions.pyaxisminvalue);
                conf._userPMax = pluckNumber(fcChartOptions.pyaxismaxvalue);
                conf._userSMin = pluckNumber(fcChartOptions.syaxisminvalue);
                conf._userSMax = pluckNumber(fcChartOptions.syaxismaxvalue);
            }
            else {
                conf._userMin = pluckNumber(fcChartOptions.yaxisminvalue);
                conf._userMax = pluckNumber(fcChartOptions.yaxismaxvalue);
            }

            optionsChart.dataStreamURL = pluck(fcChartOptions.datastreamurl, '');
            optionsChart.refreshInterval = pluckNumber(fcChartOptions.refreshinterval, 1);
            optionsChart.updateInterval = pluckNumber(fcChartOptions.updateinterval,
                optionsChart.refreshInterval);
            optionsChart.clearInterval = pluckNumber(fcChartOptions.clearchartinterval, 0);
            optionsChart.dataStamp = fcChartOptions.datastamp;
            optionsChart.useMessageLog = pluckNumber(fcChartOptions.usemessagelog, 0);
            //should not be more than 100 percent.
            optionsChart.messageLogWPercent = mathMin((pluckNumber(fcChartOptions.messagelogwpercent, 80)), 100);
            optionsChart.messageLogHPercent = mathMin((pluckNumber(fcChartOptions.messageloghpercent, 70)), 100);
            optionsChart.messageLogShowTitle = pluckNumber(fcChartOptions.messagelogshowtitle, 1);
            optionsChart.messageLogTitle = pluck(fcChartOptions.messagelogtitle, 'Message Log');
            optionsChart.messageLogColor = pluck(fcChartOptions.messagelogcolor, '#fbfbfb');
            optionsChart.messageGoesToJS = pluckNumber(fcChartOptions.messagegoestojs, 0);
            optionsChart.messageGoesToLog = pluckNumber(fcChartOptions.messagegoestolog, 1);
            optionsChart.messageJSHandler = pluck(fcChartOptions.messagejshandler, '');
            optionsChart.messagePassAllToJS = pluckNumber(fcChartOptions.messagepassalltojs, 0);
            optionsChart.messageLogIsCancelable = pluckNumber(fcChartOptions.messagelogiscancelable, 1);
            optionsChart.alwaysShowMessageLogMenu = pluckNumber(fcChartOptions.alwaysshowmessagelogmenu,
                optionsChart.useMessageLog);

            optionsChart.showRTMenuItem = pluckNumber(fcChartOptions.showrtmenuitem, 0);

            optionsChart.showRealtimeValue = showRTValue;
            optionsChart.realtimeValueSeparator = pluck(fcChartOptions.realtimevaluesep, ', ');
            optionsChart.realtimeValuePadding = rtvPadding;
            optionsChart.realtimeValueFont = pluck(fcChartOptions.realtimevaluefont, '');
            optionsChart.realtimeValueFontBold = pluck(fcChartOptions.realtimevaluefontbold, 0);
            optionsChart.realtimeValueFontColor = pluck(fcChartOptions.realtimevaluefontcolor, '');
            optionsChart.realtimeValueFontSize = pluckNumber(fcChartOptions.realtimevaluefontsize, '');

            if (showRTValue) {
                if (!conf.realtimeValues) {
                    conf.realtimeValues = [];
                    for (i = 0, l = series.length; i < l; i++) {
                        serie = series[i];
                        data = serie.data;
                        value = data && data.length && data[data.length-1] && data[data.length-1].y;
                        conf.realtimeValues[i] = numberFormatter.dataLabels(value, serie.yAxis);
                    }
                }

                if (!conf.rtLabel) {
                    style = extend2({}, conf.outCanvasStyle);
                    style.fontWeight =  optionsChart.realtimeValueFontBold ? 'bold' : 'normal';
                    if (optionsChart.realtimeValueFontColor) {
                        style.color = optionsChart.realtimeValueFontColor.replace(dropHash, HASHSTRING);
                    }
                    if (optionsChart.realtimeValueFontSize) {
                        style.fontSize = optionsChart.realtimeValueFontSize + PXSTRING;
                    }
                    if (optionsChart.realtimeValueFont) {
                        style.fontFamily = optionsChart.realtimeValueFont;
                    }
                    RTFontSize = pluckNumber(parseInt(style.fontSize, 10), 10);
                    conf.rtLabel = {
                        color: TRACKER_FILL,
                        //isNumVDIV: true,
                        alwaysVisible: true,
                        isTrend: true,
                        value: (conf.x.catCount - 1) / 2,
                        width: 0.01,
                        label: {
                            align: POSITION_CENTER,
                            textAlign: POSITION_CENTER,
                            rotation: 0,
                            textVAlign: POSITION_TOP,
                            text: ' ',
                            x: 0,
                            y: (RTFontSize * 0.8) + (hcObj.xAxis.title.margin | 0),
                            style: style
                        }
                    };
                    hcObj.xAxis.plotLines.splice(0, 0, conf.rtLabel);
                }
            }
            // Draw button for the RT Charts menu items
            if (optionsChart.showRTMenuItem) {
                (hcObj.callbacks ||
                    (hcObj.callbacks = [])).push(iapi.drawRTMenuButtons);
            }
            //RT Charts menu is not required but message logger is running
            //need to create a separate message logger menu
            //If user has opted not show message logger menu from the beginning
            //do not add this method to callback. We will invoke the method
            //directly from message logger component on receipt of first log
            else if(optionsChart.useMessageLog && optionsChart.alwaysShowMessageLogMenu){
                (hcObj.callbacks ||
                        (hcObj.callbacks = [])).push(iapi.drawMLMenuButtons);
            }

            return hcObj;
        },

        drawMLMenuButtons: function () {
            var chart = this,
                options = chart.options,
                chartOptions = options.chart,
                menu = chart.menu || (chart.menu = []),
                toolbar = chart.toolbar,
                conf = options[CONFIGKEY],
                outCanvasStyle = conf && conf.outCanvasStyle || chart.outCanvasStyle || {},
                menuItems;

            menu.push(menuItems = createContextMenu({
                chart: chart,
                basicStyle: outCanvasStyle,
                items: [{
                    text: 'Show Log',
                    visibility: HIDDEN,
                    onclick: function() {
                        lib && lib.messageLogger &&
                                lib.messageLogger.open();
                        // activate hide log
                        menuItems.showItem(4);
                        menuItems.hideItem(3);
                    }
                },{
                    //this is an invalid option as of now
                    //as the this menu will become inactive
                    //once the message logger is visible.
                    //In future this may become useful.
                    text: 'Hide Log',
                    visibility: HIDDEN,
                    onclick: function() {
                        lib && lib.messageLogger &&
                                lib.messageLogger.close();
                        // activate show log
                        menuItems.showItem(3);
                        menuItems.hideItem(4);
                    }
                }],
                position: {
                    x: chartOptions.spacingLeft,
                    y: chart.chartHeight - chartOptions.spacingBottom +
                        (!chartOptions.showFormBtn && !chartOptions.showRestoreBtn ? -15 : 10)
                }
            }));

            //initially deactive the hide log button
            //menuItems.hideItem(0);
            menuItems.hideItem(1);
            /*if(useMessageLog){
                menuItems.hideItem(1);
            }else{
                //no message logger needed hide all options.
                menuItems.hideItem(0);
                menuItems.hideItem(1);
            }*/

            chart.elements.configureButton = toolbar.add('loggerIcon', (function(x, y) {
                return function() {
                    if (menuItems.visible) {
                        menuItems.hide();
                        return;
                    }
                    menuItems.show({
                        x: x,
                        y: y + 1
                    });
                };
            }()), {
                x: chartOptions.spacingLeft,
                y: chart.chartHeight - chartOptions.spacingBottom +
                        (!chartOptions.showFormBtn &&
                                !chartOptions.showRestoreBtn ? -15 : 10),
                tooltip: 'Show & Hide Message'
            });
        },

        drawRTMenuButtons: function () {
            var chart = this,
                logic = chart.logic,
                hci = logic.chartInstance,
                options = chart.options,
                chartOptions = options.chart,
                alwaysShowMessageLogMenu = chartOptions && chartOptions.alwaysShowMessageLogMenu,
                menu = chart.menu || (chart.menu = []),
                toolbar = chart.toolbar,
                conf = options[CONFIGKEY],
                outCanvasStyle = conf && conf.outCanvasStyle || chart.outCanvasStyle || {},
                menuItems,
                isUpdateActive = hci.isUpdateActive || logic.eiMethods.isUpdateActive,
                isUpdating = isUpdateActive && isUpdateActive.call(hci);

            menu.push(menuItems = createContextMenu({
                chart: chart,
                basicStyle: outCanvasStyle,
                items: [{
                    text: 'Stop Update',
                    visibility: isUpdating ? VISIBLE : HIDDEN,
                    onclick: function() {
                        menuItems.hideItem(0);
                        menuItems.showItem(1);
                        hci.stopUpdate();
                    }
                }, {
                    text: 'Start Update',
                    visibility: isUpdating ? HIDDEN : VISIBLE,
                    onclick: function() {
                        menuItems.hideItem(1);
                        menuItems.showItem(0);
                        hci.restartUpdate();
                    }
                }, {
                    text: 'Clear Chart',
                    onclick: function() {
                        //add a selection method for start and end
                        hci.clearChart();
                    }
                },{
                    text: 'Show Log',
                    visibility: HIDDEN, // initially hidden
                    onclick: function() {
                        lib && lib.messageLogger &&
                                lib.messageLogger.open();
                        // activate hide log
                        menuItems.showItem(4);
                        menuItems.hideItem(3);
                    }
                },{
                    //this is an invalid option as of now
                    //as the this menu will become inactive
                    //once the message logger is visible.
                    //In future this may become useful.
                    text: 'Hide Log',
                    visibility: HIDDEN,
                    onclick: function() {
                        lib && lib.messageLogger &&
                                lib.messageLogger.close();
                        // activate show log
                        menuItems.showItem(3);
                        menuItems.hideItem(4);
                    }
                }],
                position: {
                    x: chartOptions.spacingLeft,
                    y: chart.chartHeight - chartOptions.spacingBottom +
                        (!chartOptions.showFormBtn && !chartOptions.showRestoreBtn ? -15 : 10)
                }
            }));

            /** @todo show hide menu items on click of the menu-items */
            if (!pluckNumber(logic.dataObj.chart.allowclear, 1)) {
                menuItems.hideItem(2);
            }

            menuItems.hideItem(0);
            menuItems.hideItem(1);
            //initially deactive the hide log button
            !alwaysShowMessageLogMenu && menuItems.hideItem(3);
            menuItems.hideItem(4);
            /*if(useMessageLog){
                menuItems.hideItem(4);
            }else{
                //no message logger needed hide all options.
                menuItems.hideItem(3);
                menuItems.hideItem(4);
            }*/

            menuItems.showItem(isUpdating ? 0 : 1);

            chart.elements.configureButton = toolbar.add('configureIcon', (function(x, y) {
                return function() {
                    if (menuItems.visible) {
                        menuItems.hide();
                        return;
                    }
                    menuItems.show({
                        x: x,
                        y: y + 1
                    });
                };
            }()), {
                x: chartOptions.spacingLeft,
                y: chart.chartHeight - chartOptions.spacingBottom +
                        (!chartOptions.showFormBtn &&
                                !chartOptions.showRestoreBtn ? -15 : 10),
                tooltip: 'Manage RealTime Update'
            });
        },

        //helper function to shift plotLines
        shiftPlotLines: function (plotLinesArray, shiftAmount, lowerLimit, conf) {
            var currentPlotLine, catXPos, removedCat = [],
                pAxisConf = conf[0],
                pRTValueArr = pAxisConf && pAxisConf.RTValueArr,
                pArrLn = (pRTValueArr && pRTValueArr.length) || 0,
                sAxisConf = conf[1],
                sRTValueArr = sAxisConf && sAxisConf.RTValueArr,
                sArrLn = (sRTValueArr && sRTValueArr.length) || 0,
                l = (plotLinesArray && plotLinesArray.length || 0),
                i,
                tempObj;

            lowerLimit = pluckNumber(lowerLimit, -0.5);

            for (i = 0; i < l; i += 1) {
                currentPlotLine = plotLinesArray[i];
                if (currentPlotLine.isGrid || currentPlotLine.isVline) {//donot shift div from numvdiv
                    catXPos = currentPlotLine.value += shiftAmount;
                    if (catXPos < lowerLimit || (catXPos === lowerLimit && currentPlotLine.isVline)) {
                    //gose out of visible area
                        plotLinesArray.splice(i, 1);
                        //keep removed grid so that we can use it for new one
                        //will reduce extra calculation related to text position
                        if (currentPlotLine.isGrid) {
                            removedCat.push(currentPlotLine);
                        }
                        i -= 1;
                        l -= 1;
                    }
                }
            }

            //shift realtive value store
            if (pAxisConf && pRTValueArr && pArrLn) {
                pRTValueArr.splice(0, -shiftAmount);
                pArrLn = pRTValueArr.length;
                //reser axis min max
                delete pAxisConf.min;
                delete pAxisConf.max;
                for (i = 0; i < pArrLn; i += 1) {
                    tempObj = pRTValueArr[i];
                    if (tempObj && tempObj.min !== undefined) {
                        if ((pAxisConf.min < tempObj.min) === false) {
                            pAxisConf.min = tempObj.min;
                        }
                        if ((pAxisConf.max > tempObj.max) === false) {
                            pAxisConf.max = tempObj.max;
                        }
                    }
                }
            }
            if (sAxisConf && sRTValueArr && sArrLn) {
                sRTValueArr.splice(0, -shiftAmount);
                sArrLn = sRTValueArr.length;
                //reser axis min max
                delete sAxisConf.min;
                delete sAxisConf.max;
                for (i = 0; i < sArrLn; i += 1) {
                    tempObj = sRTValueArr[i];
                    if (tempObj && tempObj.min !== undefined) {
                        if ((sAxisConf.min < tempObj.min) === false) {
                            sAxisConf.min = tempObj.min;
                        }
                        if ((sAxisConf.max > tempObj.max) === false) {
                            sAxisConf.max = tempObj.max;
                        }
                    }
                }
            }


            return removedCat;
        },

        configureAxis: function (hcObj) {
            var iapi = this,
                conf = hcObj[CONFIGKEY],
                xAxis = hcObj.xAxis,
                xAxisConf = conf.x,
                axisGridManager = conf.axisGridManager,
                catCount = xAxisConf.catCount,
                oriCatTmp = conf.oriCatTmp,
                pAxisConf = conf[0],
                pRTValueArr = pAxisConf && pAxisConf.RTValueArr,
                sAxisConf = conf[1],
                sRTValueArr = sAxisConf && sAxisConf.RTValueArr,

                fcDataObj = iapi.dataObj,
                fcChartOptions = fcDataObj.chart || (fcDataObj.chart = {}),
                series = hcObj.series,
                seriesZero = series[0],
                dataCount = seriesZero.data.length,
                numDisplaySets = iapi.numDisplaySets =
                    pluckNumber(fcChartOptions.numdisplaysets, mathMax(dataCount, 15)),
                plotLines = xAxis.plotLines,
                plotLineCount = (plotLines && plotLines.length) || 0,
                data,
                i,
                serie,
                nullArray = [],
                categories,
                fci = iapi.chartInstance,
                vars = fci.jsVars,
                reflowData = vars._reflowData,
                oldConf;

            //restore yaxis limits
            if (reflowData.hcJSON && (oldConf = reflowData.hcJSON[CONFIGKEY])) {
                pAxisConf.min = oldConf[0] && oldConf[0].min;
                pAxisConf.max = oldConf[0] && oldConf[0].max;
                sAxisConf.min = oldConf[1] && oldConf[1].min;
                sAxisConf.max = oldConf[1] && oldConf[1].max;
            }


            categories = ((iapi.dataObj.categories ||
                (iapi.dataObj.categories = [{
                    category : []
                }]))[0] ||
                (iapi.dataObj.categories[0] = {
                    category : []
                })).category ||
                (iapi.dataObj.categories[0].category = []);

            if (catCount === 0) {
                iapi.chartInstance.jsVars._forceReflow = true;
            }

            // Create an array of null points
            i = numDisplaySets - dataCount;
            if (i > 0) { // when null padding is needed
                while (plotLineCount--) {
                    plotLines[plotLineCount].value += i;
                }
                xAxis.plotLines = [];

                while (i--) {
                    nullArray[i] = {y: null};
                    axisGridManager.addXaxisCat(xAxis, i, i, ' ');
                    //shift RT value store also
                    pRTValueArr && pRTValueArr.unshift(null);
                    sRTValueArr && sRTValueArr.unshift(null);

                    oriCatTmp.unshift(null);
                    categories.unshift({
                        label: ' '
                    });
                }
                xAxis.plotLines = xAxis.plotLines.reverse().concat(plotLines);
            }
            else if (i) { // to ignore zero
                iapi.shiftPlotLines (xAxis.plotLines, i, -0.5, conf);
                oriCatTmp.splice(0, -i);
            }

            i = series.length;
            while (i--) {
                serie = series[i];
                data = serie.data;
                data = serie.data = nullArray.concat(data.slice(-numDisplaySets));
                dataCount = serie.length;
            }

            // When there are no historical data, chart will need redraw on
            // first realtime update.
            iapi.needsRedraw = (catCount === 0);

            // Replace category count with updated category length derived from
            // numDisplaySets
            catCount = xAxisConf.catCount = numDisplaySets;

            return chartAPI.msareabase.configureAxis &&
            chartAPI.msareabase.configureAxis.apply(this, arguments);
        },
        //post Series Adition Function
        postSeriesAddition: function (hcObj, fcObj, width, height, startPosition) {
            var conf = hcObj[CONFIGKEY],
                isBar = conf.isBar,
                rotateValues = hcObj.chart.rotateValues && !isBar ? 270 : 0,
                //for the first y axis
                pAxisConf = conf[0],
                RTValueArr = pAxisConf.RTValueArr,
                stacking100Percent = pAxisConf && pAxisConf.stacking100Percent,
                position,
                length,
                RTValue,
                i,
                ln,
                point,
                pointValue,
                labelPosition,
                value,
                labeloffsetScale,
                catPosition,
                series,
                style,
                labelFontSize,
                labelInsidePlot;

            //show the stack total if requared
            if (this.isStacked && RTValueArr && (conf.showStackTotal || stacking100Percent)) {
                catPosition = startPosition || 0;

                series = hcObj.series;

                style = extend2({}, hcObj.plotOptions.series.dataLabels.style);
                labelFontSize = parseFloat(style.fontSize);
                labelInsidePlot = !pAxisConf.stacking100Percent;

                style.color = hcObj.plotOptions.series.dataLabels.color;

                for (length = RTValueArr.length; catPosition < length; catPosition += 1) {
                    RTValue = RTValueArr[catPosition];
                    if (RTValue) {
                        value = (RTValue.n || 0) + (RTValue.p || 0);
                        if (conf.showStackTotal) {
                            position = catPosition;
                            labelPosition = position;
                            labeloffsetScale = value < 0 ? RTValue.n : RTValue.p;

                            //add the total value
                            hcObj.xAxis.plotLines.push({
                                value: labelPosition,
                                width: 0,
                                isVline: labelInsidePlot,
                                isTrend: !labelInsidePlot,
                                zIndex: 4,
                                _isStackSum: 1,
                                _catPosition: catPosition,
                                label: {
                                    align: POSITION_CENTER,
                                    textAlign: rotateValues === 270 ?
                                        (value < 0 ? POSITION_RIGHT : POSITION_LEFT) :
                                        POSITION_CENTER,
                                    offsetScale: labelInsidePlot ? labeloffsetScale : undefined,
                                    offsetScaleIndex: 0,
                                    rotation: rotateValues,
                                    style: style,
                                    verticalAlign: POSITION_TOP,
                                    y: isBar ? 0 : (value < 0 ?
                                        (rotateValues === 270 ? 4 : labelFontSize) : -4),
                                    x: 0,
                                    text: conf.numberFormatter.yAxis(value)
                                }
                            });
                        }
                        //manipulate values for 100percent stack
                        if (stacking100Percent) {
                            for (i = 0, ln = series.length; i < ln; i += 1) {
                                if (series[i].data) {
                                    point = series[i].data[catPosition];
                                    if (point.y || point.y === 0) {
                                        pointValue = point.y / value * 100;
                                        point.y = pointValue;
                                        //set display value
                                        if (point.showPercentValues) {
                                            point.displayValue = this.numberFormatter.percentValue(pointValue);
                                        }
                                        //set tooltip
                                        if (point.showPercentInToolTip) {
                                            point.toolText = point.toolText +
                                                (parseInt(pointValue * 100, 10) / 100) + '%';
                                        }
                                    }
                                    if (point.previousY || point.previousY === 0) {
                                        point.previousY = point.previousY / value * 100;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },

        /** @note will not work for msstacked, combi */
        pointValueWatcher: function(HCObj, value, yAxisIndex, isStacked, index) {
            if (value !== null) {
                var FCconf = HCObj[CONFIGKEY],
                    obj = FCconf[yAxisIndex || (yAxisIndex = 0)],
                    RTValueArr,
                    indexedObj,
                    oldStackReturn;

                if (!obj) {
                    obj = FCconf[yAxisIndex] = {};
                }
                RTValueArr = obj.RTValueArr;
                if (!RTValueArr) {
                    RTValueArr = obj.RTValueArr = [];
                }
                indexedObj = RTValueArr[index];
                if (!indexedObj) {
                    indexedObj = RTValueArr[index] = {};
                }

                if (isStacked) {
                    if (value >= 0) {
                        if (indexedObj.p) {
                            oldStackReturn = indexedObj.p;
                            value = indexedObj.p += value;
                        }
                        else {
                            indexedObj.p = value;
                        }
                    }
                    else {
                        if (indexedObj.n) {
                            oldStackReturn = indexedObj.n;
                            value = indexedObj.n += value;
                        }
                        else {
                            indexedObj.n = value;
                        }
                    }
                }

                if ((indexedObj.max > value) === false) {
                    indexedObj.max = value;
                    if ((obj.max > value) === false) {
                        obj.max = value;
                    }
                }
                if ((indexedObj.min < value) === false) {
                    indexedObj.min = value;
                    if ((obj.min < value) === false) {
                        obj.min = value;
                    }
                }
                return oldStackReturn;
            }
        },

        realtimeUpdate: function (update, silent) {
            var iapi = this,
                hcJSON = iapi.hcJSON,
                optionsChart = hcJSON.chart,
                dataObj = iapi.dataObj,
                FCchartObj = dataObj.chart,
                allowClear = (FCchartObj.allowclear === '0' ? 0 : 1),
                conf = hcJSON[CONFIGKEY],
                numberFormatter = iapi.numberFormatter,
                xConf = conf.x,
                labelY = xConf._labelY,
                labelX = xConf._labelX,
                yShipment = xConf._yShipment,
                isStagger = xConf._isStagger,
                rotation = xConf._rotation,
                textAlign = xConf._textAlign,
                adjustedPx = xConf._adjustedPx,
                staggerLines = xConf._staggerLines,
                labelHeight = xConf._labelHeight,
                isNotStepped,
                axisGridManager = conf.axisGridManager,
                catCount = xConf.catCount,
                renderer = iapi.renderer,
                fci = iapi.chartInstance,
                vars = fci.jsVars,
                values = update.values,
                labels = update.labels || [],
                showLabels = update.showLabels || [],
                colors = update.colors,
                toolTexts = update.toolTexts,
                links = update.links,
                xAxisObj = hcJSON.xAxis,
                xAxisLabelsHidden = (dataObj.chart.showlabels === '0'),
                showRealtimeValue = optionsChart.showRealtimeValue,
                categories = dataObj.categories, // from dataObj
                reflowData = vars._reflowData,
                removedCat = [],
                //required for steping cal
                startIndex = pluckNumber(conf._startIndex, 0),
                stepValue =  xConf.stepValue,
                // in case more data is provided than what is viewable, simply
                // drop it from calculation.
                dimension = update.dimension > catCount ? catCount : update.dimension,
                remainingPlotLines = catCount - dimension,
                newSeries = [],
                vlines = update.vlines,
                vlineColors,
                vlineLabels,
                vlineThickness,
                vlinedashed,
                newData,
                labelObj,
                yAxisObj,
                yAxisConf,
                stopMaxAtZero,
                setMinAsZero,
                axisRange,
                setadaptiveymin,
                numDivLines,
                adjustDiv,
                yAxisIndex,
                rtCounter,
                catTempPos,
                i,
                j,
                k,
                l,
                m,
                noPAxisChange,
                plotElemArr,
                serie,
                data,
                point,
                valueset,
                colorset,
                linkset,
                tooltextset,
                value,
                unCleanedValue,
                label,
                currentPlotLine,
                catPosValue,
                yAxisMaxValue,
                yAxisMinValue,
                showYAxisValues,
                showLimits,
                showDivLineValues,
                yaxisvaluesstep,
                redrawingStartTime = new Date(),
                _conf,
                //showsum
                temp = {};

            if (update.clear && allowClear) {
                this.realtimeUpdate({
                    dimension: iapi.numDisplaySets,
                    values: [],
                    labels: []
                }, update.dimension > 0);
            }

            if (!update.dimension) {
                return;
            }

            // disable series animation
            hcJSON.plotOptions.series.animation = false;

            if (vlines) {
                vlineColors = update.vlineColors || [];
                vlineLabels = update.vlineLabels || [];
                vlineThickness = update.vlineThickness || [];
                vlinedashed = update.vlineDashed || [];
            }
            else {
                vlines = [];
            }


            if (!(categories)) {
                categories = dataObj.categories = [];
            }
            if (!categories[0]) {
                categories[0] = {
                    category: []
                };
            }
            else if (!categories[0].category) {
                categories[0].category = [];
            }
            // look into the total cat array
            categories = categories[0].category;
            removedCat = iapi.shiftPlotLines (xAxisObj.plotLines, -dimension, -0.5, conf);
            i = removedCat.length;
            while (i--) {
                if ((currentPlotLine = removedCat[i]).label) {
                    labelObj = currentPlotLine.label;
                    labelObj.text = (showLabels[i] === '0' || xAxisLabelsHidden) ? '' :
                    parseUnsafeString(labels[i] || BLANKSTRING);

                    catPosValue = remainingPlotLines + i;
                    currentPlotLine.value = catPosValue;
                    catTempPos = catCount + i + startIndex;
                    isNotStepped = catTempPos % stepValue === 0;
                    if (isNotStepped) {
                        labelObj.style = xAxisObj.labels.style;
                        labelObj.y = isStagger ? labelY + (((catTempPos / stepValue) %
                            staggerLines) * labelHeight) : yShipment;
                        labelObj.x = labelX + (rotation ? adjustedPx : 0);
                        labelObj.rotation = rotation;
                        labelObj.textAlign = textAlign;
                    }
                    else {
                        labelObj.style = xAxisObj.steppedLabels.style;
                    }


                    xAxisObj.plotLines.push(extend2({}, currentPlotLine));
                    categories.shift();
                    categories.push({
                        label: labelObj.text
                    });
                }
                //add the vline if exist
                if (vlines[i] === '1') {
                    axisGridManager.addVline(xAxisObj, {
                        color: vlineColors[i] && decodeURIComponent(vlineColors[i]),
                        label: vlineLabels[i] && decodeURIComponent(vlineLabels[i]),
                        thickness: vlineThickness[i] && decodeURIComponent(vlineThickness[i]),
                        dashed: vlinedashed[i] && decodeURIComponent(vlinedashed[i])
                    }, remainingPlotLines + i, hcJSON);
                }
            }
//
//

            newSeries = [];

            // the current start index is saved for future use.
            conf._startIndex = (dimension + startIndex) % (isStagger ? stepValue * staggerLines : stepValue);

            m = hcJSON.series && hcJSON.series.length;

            // k will be leftover from
            if (dimension) {
                conf.oriCatTmp.splice(0, dimension);
            }
            conf._skipValueWatcher = false;

            //sum calculation

            for (i = 0; i < m; i += 1) {
                serie = hcJSON.series[i];
                valueset = (values && values[i]) || [];
                colorset = (colors && colors[i]) || [];
                linkset = (links && links[i]) || [];
                tooltextset = (toolTexts && toolTexts[i]) || [];
                yAxisIndex = serie.yAxis || 0;
                rtCounter = conf._rtCounter || (conf._rtCounter = 1);

                !newSeries[i] && (newSeries[i] = []);
                newData = newSeries[i];

                data = serie.data;
                for (l = data.length, j = (l - dimension), k = 0;
                    j < l; j += 1, k += 1) {
                    unCleanedValue =  decodeURIComponent(getValidValue(valueset[k], null));
                    value = numberFormatter.getCleanValue(unCleanedValue);
                    label = decodeURIComponent(labels[k] || '');
                    conf.oriCatTmp[j] = label;
                    data.shift();
                    point = serie._dataParser({
                        value: unCleanedValue,
                        label: label,
                        color: colorset && colorset[k] &&
                        decodeURIComponent(colorset[k]),
                        link: linkset && linkset[k] &&
                        decodeURIComponent(linkset[k]),
                        tooltext: tooltextset && tooltextset[k] &&
                        decodeURIComponent(tooltextset[k])
                    }, j, value);
                    point.y = value;
                    data.push(point);
                    newData.push(point);

                    point.previousY = iapi.pointValueWatcher(hcJSON, value, yAxisIndex,
                        iapi.isStacked, j);
                }

                // update the last value of the series in the realtime value
                // array
                if (showRealtimeValue) {
                    conf.realtimeValues[i] = numberFormatter.dataLabels(value, serie.yAxis);
                }
            }
            conf._rtCounter += dimension;

            iapi.postSeriesAddition(hcJSON, undefined, undefined, undefined, l - dimension);


            if (showRealtimeValue) {
                iapi.prepareRealtimeValueText();
            }

            yAxisObj = hcJSON.yAxis[0];
            yAxisConf = conf[0];
            // adaptiveymin is available for non-stack charts
            setadaptiveymin = pluckNumber(iapi.isStacked ? 0 : iapi.setAdaptiveYMin, FCchartObj.setadaptiveymin, 0);
            setMinAsZero = stopMaxAtZero = !setadaptiveymin;
            axisRange = (yAxisObj.max - yAxisObj.min) / 4;
//
//
//            // reflow should be done if the calculated max (or) min is greater (or) less than
//            // the current max (or) min RESPECTIVELY, (or) if the range of the calculated
//            // max/min is less than half of the range of the current max/min (and) current
//            // max (or) min is not the user specified max (or) min.
            if (conf.isDual) {
                if (yAxisConf.max > yAxisObj.max  || yAxisConf.min < yAxisObj.min ||
                    (!(setMinAsZero  && yAxisObj.min === 0) && yAxisObj.min !== conf._userPMin &&
                        ((yAxisConf.min - yAxisObj.min) > axisRange)) || (!(stopMaxAtZero  &&
                        yAxisObj.max === 0) && yAxisObj.max !== conf._userPMax &&
                    ((yAxisObj.max - yAxisConf.max) > axisRange))) {
                    vars._forceReflow = true;
                    conf._skipValueWatcher  = true;
                }

                yAxisObj = hcJSON.yAxis[1];
                yAxisConf = conf[1];
                setMinAsZero = stopMaxAtZero = !pluckNumber(FCchartObj.setadaptivesymin, setadaptiveymin);
                axisRange = (yAxisObj.max - yAxisObj.min) / 4;

                if (yAxisConf.max > yAxisObj.max  || yAxisConf.min < yAxisObj.min ||
                    (!(setMinAsZero  && yAxisObj.min === 0) && yAxisObj.min !== conf._userSMin &&
                        ((yAxisConf.min - yAxisObj.min) > axisRange)) || (!(stopMaxAtZero  &&
                        yAxisObj.max === 0) && yAxisObj.max !== conf._userSMax &&
                    ((yAxisObj.max - yAxisConf.max) > axisRange))) {
                    vars._forceReflow = true;
                    conf._skipValueWatcher  = true;
                }
            } else {
                if (yAxisConf.max > yAxisObj.max  || yAxisConf.min < yAxisObj.min ||
                    (!(setMinAsZero  && yAxisObj.min === 0) && yAxisObj.min !== conf._userMin &&
                        ((yAxisConf.min - yAxisObj.min) > axisRange)) || (!(stopMaxAtZero  &&
                        yAxisObj.max === 0) && yAxisObj.max !== conf._userMax &&
                    ((yAxisObj.max - yAxisConf.max) > axisRange))) {
                    vars._forceReflow = true;
                    conf._skipValueWatcher  = true;
                }
            }

            temp.RTValueArr = conf[0] && conf[0].RTValueArr;
            temp.RTValueArr1 = conf[1] && conf[1].RTValueArr;
//
//            // Recalculation of yAxis if updated data is out of the Axis limits
            if (vars._forceReflow) {
                // Calculation of primiry yAxis
                yAxisObj = hcJSON.yAxis[0];
                yAxisConf = conf[0];

                //store data min max temporarily
                temp.min = conf[0] && conf[0].min;
                temp.max = conf[0] && conf[0].max;
                temp.min1 = conf[1] && conf[1].min;
                temp.max1 = conf[1] && conf[1].max;
                temp.oldMin = yAxisObj.min;
                temp.oldMax = yAxisObj.max;



                numDivLines = pluckNumber(conf.numdivlines,
                    FCchartObj.numdivlines, iapi.numdivlines, 4);
                adjustDiv = FCchartObj.adjustdiv !== ZEROSTRING;

                yAxisMaxValue = pluckNumber(conf._userMax, conf._userPMax);
                yAxisMinValue = pluckNumber(conf._userMin, conf._userPMin);
                showYAxisValues = pluckNumber(FCchartObj.showyaxisvalues,
                    FCchartObj.showyaxisvalue, 1);
                showLimits = pluckNumber(FCchartObj.showlimits,
                    showYAxisValues);
                showDivLineValues = pluckNumber(FCchartObj.showdivlinevalue,
                    FCchartObj.showdivlinevalues, showYAxisValues);
                yaxisvaluesstep = pluckNumber(
                    parseInt(FCchartObj.yaxisvaluesstep, 10),
                    parseInt(FCchartObj.yaxisvaluestep, 10), 1);
                yaxisvaluesstep = yaxisvaluesstep < 1 ? 1 : yaxisvaluesstep;

                // calculate the axis min max and the div interval for y axis
                iapi.axisMinMaxSetter(yAxisObj, yAxisConf, yAxisMaxValue,
                    yAxisMinValue, stopMaxAtZero, setMinAsZero,
                    numDivLines, adjustDiv);
                yAxisObj.plotLines = [];
                yAxisObj.plotBands = [];
                yAxisObj.labels.enabled = yAxisObj.labels._enabled;
                yAxisObj.gridLineWidth = yAxisObj._gridLineWidth;
                yAxisObj.alternateGridColor = yAxisObj._alternateGridColor;

                // create label category and remove trend obj if out side limit
                iapi.configurePlotLines(FCchartObj, hcJSON, yAxisObj, yAxisConf,
                    showLimits, showDivLineValues, yaxisvaluesstep,
                    conf.numberFormatter, false);
                //if no min max update then remove _forceReflow flag
                if (temp.oldMin === yAxisObj.min && temp.oldMax === yAxisObj.max) {
                    noPAxisChange = true;
                }
                // Calculation of secondary yAxis
                if (conf.isDual) {
                    yAxisMaxValue = conf._userSMax;
                    yAxisMinValue = conf._userSMin;
                    setadaptiveymin = pluckNumber(FCchartObj.setadaptivesymin,
                        setadaptiveymin);
                    setMinAsZero = stopMaxAtZero = !setadaptiveymin;
                    showLimits = pluckNumber(FCchartObj.showsecondarylimits,
                        showLimits);
                    showDivLineValues = pluckNumber(
                        FCchartObj.showdivlinesecondaryvalue, showYAxisValues);

                    yAxisObj = hcJSON.yAxis[1];
                    yAxisConf = conf[1];
                    //store old min max
                    temp.oldMin = yAxisObj.min;
                    temp.oldMax = yAxisObj.max;

                    // calculate the axis min max and the div interval
                    // for y axis
                    iapi.axisMinMaxSetter(yAxisObj, yAxisConf, yAxisMaxValue,
                        yAxisMinValue, stopMaxAtZero, setMinAsZero,
                        numDivLines, adjustDiv);

                    yAxisObj.plotLines = [];
                    yAxisObj.plotBands = [];
                    yAxisObj.labels.enabled = yAxisObj.labels._enabled;
                    yAxisObj.gridLineWidth = yAxisObj._gridLineWidth;
                    yAxisObj.alternateGridColor = yAxisObj._alternateGridColor;

                    // create label category and remove trend obj
                    // if out side limit
                    iapi.configurePlotLines(FCchartObj, hcJSON, yAxisObj,
                        yAxisConf, showLimits, showDivLineValues,
                        yaxisvaluesstep, conf.numberFormatter, true);
                    //if no min max update then remove _forceReflow flag
                    if(temp.oldMin === yAxisObj.min && temp.oldMax === yAxisObj.max && noPAxisChange){
                        vars._forceReflow = false;
                    }
                }
                else if(noPAxisChange){
                    vars._forceReflow = false;
                }

                // Recreate trendLines
                if (dataObj.trendlines) {
                    createTrendLine(dataObj.trendlines, hcJSON.yAxis, conf,
                        conf.isDual, iapi.isBar);
                }
            }

            if (reflowData.hcJSON) {
                _conf = reflowData.hcJSON[CONFIGKEY];
                delete reflowData.hcJSON[CONFIGKEY];
                extend2(hcJSON.series, reflowData.hcJSON.series, true);
                reflowData.hcJSON[CONFIGKEY] = _conf;
                _conf = null;
            }

            extend2(reflowData, {
                preReflowAdjustments: function () {
                    var iapi = this;
                    iapi.dataObj.categories = dataObj.categories;
                },
//
                postReflowAdjustments: function () {
                    var iapi = this,
                            i,
                            series = hcJSON.series,
                            ln = series && series.length;
                    iapi.hcJSON.xAxis.plotLines = xAxisObj.plotLines;
                    // Retaining a copy of latest values for later use
                    iapi.hcJSON._FCconf[0].RTValueArr = temp.RTValueArr;
                    iapi.hcJSON._FCconf[1].RTValueArr = temp.RTValueArr1;
                    if (series){
                        for (i = 0; i < ln; i += 1){
                            iapi.hcJSON.series[i].data = series[i].data;
                        }
                    }
                },
                postHCJSONCreation : function (hcJSON) {
                    extend2(hcJSON, {
                        _FCconf: {
                            0: {
                                min: temp.min,
                                max: temp.max
                            },
                            1: {
                                min: temp.min1,
                                max: temp.max1
                            },
                            _skipValueWatcher: true,

                            // resync the updated realtime values with the new
                            // HCJSON
                            realtimeValues: conf.realtimeValues,
                            rtvHTMLWrapper: conf.rtvHTMLWrapper
                        }
                    }, true);
                },

                hcJSON: {
                    _FCconf: {
                        _userMax: conf._userMax,
                        _userMin: conf._userMin,
                        _userPMax: conf._userPMax,
                        _userSMax: conf._userSMax,
                        _userPMin: conf._userPMin,
                        _userSMin: conf._userSMin,
                        _chartState: conf._chartState,
                        _rtCounter: conf._rtCounter,
                        _startIndex: conf._startIndex,
                        oriCatTmp: conf.oriCatTmp,

                        x: {
                            catCount: catCount,
                            _labelY: labelY,
                            _labelX: labelX,
                            _yShipment: yShipment,
                            _isStagger: isStagger,
                            _rotation: rotation,
                            _textAlign: textAlign,
                            _adjustedPx: adjustedPx,
                            _staggerLines: staggerLines,
                            _labelHeight: labelHeight
                        },
                        0: {
                            min: pluckNumber(temp.min, conf[0] && conf[0].min),
                            max: pluckNumber(temp.max, conf[0] && conf[0].max)
                        },
                        1: {
                            min: pluckNumber(temp.min1, conf[1] && conf[1].min),
                            max: pluckNumber(temp.max1, conf[1] && conf[1].max)
                        }
                    }
                }
            }, true);

            if (!silent) {

                if (vars._forceReflow) {
                    vars._forceReflow = false;
                    yAxisObj = hcJSON.yAxis[0];
                    plotElemArr = yAxisObj.plotBands.concat(yAxisObj.plotLines);
                    yAxisLabelAdjuster (yAxisObj, plotElemArr);
                    renderer.yAxis[0].realtimeUpdateY(yAxisObj.min, yAxisObj.max);
                    if (conf.isDual) {
                        yAxisObj = hcJSON.yAxis[1];
                        plotElemArr = yAxisObj.plotBands.concat(yAxisObj.plotLines);
                        yAxisLabelAdjuster (yAxisObj, plotElemArr);
                        renderer.yAxis[1].realtimeUpdateY(yAxisObj.min, yAxisObj.max);
                    }
                    /** @todo: should not call resize event */
                    iapi.containerElement.resizeTo();
                }
                renderer.xAxis[0].realtimeUpdateX(dimension);

                for (i = 0, j = newSeries.length; i < j; i += 1) {
                    if (renderer.plots[i] && renderer.plots[i].realtimeUpdate) {
                        renderer.plots[i].realtimeUpdate(dimension, vars._forceReflow);
                    }
                }
                iapi.realtimeDrawingLatency = (new Date()) - redrawingStartTime;
            }
        },

        extractTrendLines: function (yAxisObj) {
            // Extract all the trendlines from the plotlines array and store it seperately
            // to be merged after the old plotLines have been replaced.

            var plotLines = yAxisObj.plotLines, plotBands = yAxisObj.plotBands, plotBand,
            i, len = plotLines.length, plotLine, trendBandArr = [], trendLineArr = [];

            while (len) {
                i = len - 1;

                plotLine = plotLines[i];
                if (plotLine.isTrend) {
                    // it is a trendline. store it in a seperate array.
                    trendLineArr.push(plotLine);

                }
                len -= 1;
            }

            len = plotBands.length;

            while (len) {
                i = len - 1;

                plotBand = plotBands[i];
                if (plotBand.isTrend) {
                    // it is a trendline. store it in a seperate array.
                    trendBandArr.push(plotBand);

                }
                len -= 1;
            }

            return {
                trendLines: trendLineArr,
                trendBands: trendBandArr
            };

        }
    };

    extend(realTimeExtension.eiMethods, {

        clearChart: function (_source) {
            _source = (_source && _source.toString && _source.toString());
            this.feedData('clear=1');

            lib.raiseEvent('ChartCleared', {
                source: _source
            }, this, [this.id, _source]);
        },

        getDataJSON: function () {
            return this.jsVars._rtLastUpdatedData || {
                values: []
            };
        },

        getData: function () {
            var vars = this.jsVars,
            hcObj = vars.hcObj,
            hci = hcObj.options,
            conf = hci[CONFIGKEY],
            categories = conf.oriCatTmp,
            series,
            serie,
            table = [],
            column,
            row,
            data,
            i,
            j;

            if (!hci || !hci.series) {
                return table;
            }

            series = hci.series;
            column = [];
            i = series.length;
            while (i--) {
                serie = series[i];
                column[serie.index] = serie.name;
                data = serie.data;
                j = categories.length;
                while (j--) {
                    row = table[j] || (table[j] = [categories[j]]);
                    row[i + 1] = data[j].y;
                }
            }
            column.unshift(null);
            table.unshift(column);

            return table;
        }
    });


    /* RealTimeArea Charts */
    chartAPI('realtimearea', extend({
        friendlyName: 'Realtime Data Streaming Area Chart',
        standaloneInit: true,
        multisetRealtime: true,
        defaultPlotShadow: 1,
        creditLabel: creditLabel,
        rendererId: 'realtimecartesian'
    }, realTimeExtension), chartAPI.msareabase);

    /* RealTimeColumn Charts */
    chartAPI('realtimecolumn', extend({
        friendlyName: 'Realtime Data Streaming Column Chart',
        standaloneInit: true,
        multisetRealtime: true,
        creditLabel: creditLabel,
        rendererId: 'realtimecartesian'
    }, realTimeExtension), chartAPI.mscolumn2dbase);

    /* RealTimeLine Charts */
    chartAPI('realtimeline', extend({
        friendlyName: 'Realtime Data Streaming Line Chart',
        standaloneInit: true,
        multisetRealtime: true,
        creditLabel: creditLabel,
        rendererId: 'realtimecartesian'
    }, realTimeExtension), chartAPI.mslinebase);

    /* RealTimeLineDY Charts */
    chartAPI('realtimelinedy', extend({
        friendlyName: 'Realtime Data Streaming Dual Y-Axis Line Chart',
        standaloneInit: true,
        multisetRealtime: true,
        isDual: true,
        creditLabel: creditLabel,
        series : chartAPI.mscombibase,
        rendererId: 'realtimecartesian'
    }, realTimeExtension), chartAPI.mslinebase);

    /* RealTimeStackedArea Charts */
    chartAPI('realtimestackedarea', {
        friendlyName: 'Realtime Data Streaming Stacked Area Chart',
        isStacked: true,
        showSum : 0,
        areaAlpha: 100,
        creditLabel: creditLabel
    }, chartAPI.realtimearea);

    /* RealTimeStackedColumn Charts */
    chartAPI('realtimestackedcolumn', {
        friendlyName: 'Realtime Data Streaming Column Chart',
        isStacked: true,
        creditLabel: creditLabel
    }, chartAPI.realtimecolumn);

    /*
     *Color Range API
     */

    sortColorFN = function (a, b) {
        return a.minvalue - b.minvalue;
    };

    //**** Color Range Module ****//
    //we are modifing on the supplyed colorArr, so make sure it is a clone of original JSON
    //and no changes in other place will effect it
    function ColorRange(colorArr, defaultObj, defuPaletteOptions, chartAPI) {
        var colorObj, colorObjNext, i, l, temp, newColorRange, j, newMin, nextIndex;
        if (!(defuPaletteOptions instanceof Array)){
            defuPaletteOptions = this.colorManager.getPlotColor(0);
        }
        if (colorArr && colorArr.length > 0) {
            l = colorArr.length - 1;
            //validate all color object
            //remove invalid obj
            for (i = l; i >= 0; i -= 1) {
                //for (i = colorArr.length; i > 0; i -= 1) {
                colorObj = colorArr[i];
                if (colorObj){
                    colorObj.minvalue = chartAPI.numberFormatter.getCleanValue(colorObj.minvalue);
                    colorObj.maxvalue = chartAPI.numberFormatter.getCleanValue(colorObj.maxvalue);

                    //for not specified min/max value
                    if (colorObj.minvalue === null) {
                        if (colorObj.maxvalue !== null) {
                            colorObj.minvalue = colorObj.maxvalue;
                        }
                        else if (i !== l){//remove invalid color range
                            colorArr.splice(i, 1);
                        }
                    }


                    if (colorObj.label !== undefined) {
                        colorObj.label = parseUnsafeString(colorObj.label);
                    }

                    if (colorObj.name !== undefined) {
                        colorObj.name = parseUnsafeString(colorObj.name);
                    }

                    if (colorObj.maxvalue !== null) {
                        if (colorObj.minvalue > colorObj.maxvalue) {//alter the value
                            temp = colorObj.minvalue;
                            colorObj.minvalue = colorObj.maxvalue;
                            colorObj.maxvalue = temp;
                        }
                    }
                }
            }
            //now sort colors
            colorArr.sort(sortColorFN);

            // Put the default Color if color not given in color Obj
            if (!colorArr[0].code) {
                colorArr[0].code = defuPaletteOptions[0];
            }
            // Put the default Alpha if Alpha not given in color Obj
            if (getValidValue(colorArr[0].alpha) === undefined) {
                colorArr[0].alpha = HUNDREDSTRING;
            }
            //now devide overlaping color ranges
            for (i = 0, l = colorArr.length - 1; i < l; i += 1) {
                nextIndex = i + 1;
                colorObj = colorArr[i];
                colorObjNext = colorArr[nextIndex];
                // Put the default Color if color not given in color Obj
                if (!colorObjNext.code) {
                    colorObjNext.code = defuPaletteOptions[nextIndex];
                }
                // Put the default Alpha if Alpha not given in color Obj
                if (getValidValue(colorObjNext.alpha) === undefined) {
                    colorObjNext.alpha = HUNDREDSTRING;
                }
                //if maxColor is null
                if (colorObj.maxvalue === null) {
                    colorObj.maxvalue = colorObjNext.minvalue;
                }

                if (colorObj.maxvalue > colorObjNext.minvalue) {
                    if (colorObj.maxvalue > colorObjNext.maxvalue) {
                        newColorRange = extend2(colorObj);
                        newColorRange.maxvalue = colorObj.maxvalue;
                        newMin = newColorRange.minvalue = colorObjNext.maxvalue;
                        //insert newColorRange into proper position
                        /* jshint ignore:start */
                        for (j = i + 2; j < l && colorArr[j].minvalue < newMin; j += 1) { }
                        /* jshint ignore:end */
                        colorArr.splice(j, 0, newColorRange);
                        l += 1;//legth increased
                    }
                    colorObj.maxvalue = colorObjNext.minvalue;
                }
            }
            //if last color has null maxvalue
            colorObj = colorArr[i];
            //if maxColor is null
            if (colorObj.maxvalue === null) {
                colorObj.maxvalue = colorObj.minvalue;
            }

        }

        if (!(colorArr && colorArr.length > 0)) {
            if (!defaultObj) {
                defaultObj = {
                    code: 'CCCCCC',
                    alpha: '100',
                    bordercolor: '000000',
                    borderalpha: '100'
                };
            }
            colorArr = [defaultObj];
            this.defaultAsigned = true;
        }

        this.colorArr = colorArr;
    }
    ColorRange.prototype = {
        getColorObj : function (value) {
            var colorArr = this.colorArr, i = 0, l = colorArr.length, colorObj,
                nextColorObj,
            returnedObj = {};
            for (; i < l; i += 1) {
                returnedObj.index = i;
                colorObj = colorArr[i];
                nextColorObj = colorArr[i + 1];
                if (value < colorObj.minvalue) {
                    returnedObj.nextObj = colorObj;
                    return returnedObj;
                }
                if (value >= colorObj.minvalue && value <= colorObj.maxvalue) {
                    returnedObj.colorObj = colorObj;
                    if (nextColorObj && value == nextColorObj.minvalue) {//at the border of two color point
                        returnedObj.nextObj = nextColorObj;
                        returnedObj.isOnMeetPoint = true;
                    }
                    return returnedObj;
                }
                returnedObj.prevObj = colorObj;
            }
            returnedObj.index = i - 1;
            return returnedObj;
        },
        getColorRangeArr : function (minValue, maxValue) {
            var temp, colorArr = this.colorArr, i, l, minColorObj, lastMaxValue,
            maxColorObj, returnArr = [], colorObj, lastColorObj;
            if (!this.defaultAsigned) {
                if (minValue > maxValue) {//Swap
                    temp = minValue;
                    minValue = maxValue;
                    maxValue = temp;
                }
                if (minValue < maxValue) {
                    minColorObj = this.getColorObj(minValue);
                    maxColorObj = this.getColorObj(maxValue);
                    if (minColorObj && maxColorObj) {
                        lastMaxValue = minValue;
                        i = minColorObj.index;
                        l = maxColorObj.index;
                        for (; i <= l; i += 1) {
                            colorObj = extend2({}, colorArr[i]);
                            if (colorObj.minvalue !== lastMaxValue) {
                                colorObj.minvalue = lastMaxValue;
                            }
                            returnArr.push(colorObj);
                            lastColorObj = colorObj;
                            lastMaxValue = colorObj.maxvalue;
                        }
                        lastColorObj.maxvalue = maxValue;

                    }
                }
            }
            return returnArr;
        }
    };
    ColorRange.prototype.constructor = ColorRange;


/******************************************************************************
 * Raphael Renderer Extension
 ******************************************************************************/

    renderer = chartAPI,

    drawThermometer = (function () {
        //list of attr that will handled here
        var attrList = {
            fluidHRatio : true,
            fluidColor : true,
            fluidAlpha : true,
            fluidFill : true
        },
        blankArr = [],
        animDuration = 0,
        setAnimate = function (animation) {
            animDuration = Boolean(animation) ? animation.duration : 0;
        },
        attr = function (hash, val) {
            var key,
            value,
            element = this,
            color,
            alpha,
            colorObject,
            colorChanged = false,
            shapeChanged = false,
            attr3D = this._3dAttr,
            darkFlColor,
            y6;

            // single key-value pair
            if (isString(hash) && defined(val)) {
                key = hash;
                hash = {};
                hash[key] = val;
            }

            // used as a getter: first argument is a string, second is undefined
            if (isString(hash)) {
                //if belongs from the list then handle here
                if (attrList[hash]) {
                    element = element._3dAttr[hash];
                }
                else {//else leve for the original attr
                    element = element._attr(hash);
                }

            // setter
            } else {
                for (key in hash) {
                    value = hash[key];

                    //if belongs from the list then handle here
                    if (attrList[key]) {
                        //if it is 'fill' or 'lighting3D' the redefine the colors for all the 3 elements
                        if (key === 'fluidFill') {
                            if (value && value.linearGradient && value.stops && value.stops[0]) {
                                value = value.stops[0][1];
                            }

                            if (startsRGBA.test(value)) {
                                colorObject = new Color(value);
                                color = colorObject.get('hex');
                                alpha = colorObject.get('a') * 100;
                            }
                            else if (value && value.FCcolor) {
                                color = value.FCcolor.color.split(COMMASTRING)[0];
                                alpha = value.FCcolor.alpha.split(COMMASTRING)[0];
                            }
                            else if (HEXCODE.test(value)) {
                                color = value.replace(dropHash, HASHSTRING);
                            }
                            attr3D.fluidColor = pluck(color, attr3D.fluidColor, '000000');
                            attr3D.fluidAlpha = pluckNumber(alpha, attr3D.fluidAlpha, 100);
                            colorChanged = true;
                        }
                        else if (key === 'fluidColor') {
                            attr3D.fluidColor = pluck(value, attr3D.fluidColor, '000000');
                            colorChanged = true;
                        }
                        else if (key === 'fluidAlpha') {
                            attr3D.fluidAlpha = pluckNumber(value, attr3D.fluidAlpha, 100);
                            colorChanged = true;
                        }
                        else if (value >= 0 && value <= 1){
                            attr3D.fluidHRatio = value;
                            shapeChanged = true;
                        }
                        if (colorChanged) {
                            darkFlColor = getDarkColor(attr3D.fluidColor, attr3D.is2D ? 80 : 70);
                            //draw the Fluid
                            element.fluid.attr({
                                fill : convertColor(darkFlColor, attr3D.fluidAlpha)
                            });


                            element.fluidTop.attr({
                                fill : convertColor(darkFlColor, attr3D.fluidAlpha)
                            });

                            element.topLight.attr({
                                stroke : convertColor(darkFlColor, attr3D.fluidAlpha * 0.4)
                            });

                            element.topLightBorder.attr({
                                fill: toRaphaelColor({
                                    FCcolor: {
                                        color : darkFlColor + COMMASTRING + darkFlColor,
//                                        alpha : '0,' + (attr3D.fluidAlpha * 0.3),
//                                        ratio : '0,80',
//                                        angle : 90
                                        alpha: '40,0',
                                        ratio: '0,80',
                                        radialGradient: true,
                                        cx : 0.5,
                                        cy : 1,
                                        r : '70%'
                                    }
                                })
                            });

                        }
                        if (shapeChanged) {
                            y6 = attr3D.scaleY + (attr3D.h * (1 - attr3D.fluidHRatio));
                            //draw the Fluid
                            if (animDuration) {
                                element.fluid.animate({
                                    path: attr3D.fluidPath.concat([L, attr3D.lx2, y6, attr3D.lx1, y6, Z])
                                }, animDuration, ANIM_EFFECT);

                                //draw the Fluid
                                element.fluidTop.animate({
                                    path: blankArr.concat([M, attr3D.lx1, y6,
                                        A, attr3D.lCylWidthHalf, 1, 0, 1, 0, attr3D.lx2, y6, Z])
                                }, animDuration, ANIM_EFFECT);
                            }
                            else {
                                element.fluid.attr({
                                    path: attr3D.fluidPath.concat([L, attr3D.lx2, y6, attr3D.lx1, y6, Z])
                                });

                                //draw the Fluid
                                element.fluidTop.attr({
                                    path: blankArr.concat([M, attr3D.lx1, y6,
                                        A, attr3D.lCylWidthHalf, 1, 0, 1, 0, attr3D.lx2, y6, Z])
                                });
                            }
                        }
                    }
                    else {//else leave for the original attr
                        this._attr(key, value);
                    }
                }
            }
            return element;
        },

        shadow = function (apply, group, options) {
            this.border.shadow(apply, group, options);
        };

        return function (x, y, r, h, thGroup, renderer, fluidHRatio, conColor,
            conBorderColor, conBorderThickness, fluidColor, fluidAlpha, is2D) {

            var darkColor,
            darkFlColor,
            lightColor,
            cos50,
            sin50,
            cylinderWidthHalf,
            scaleTop,
            topRoundR,
            topRoundRDistance,
            bulbCenterDistance,
            x1,
            x2,
            x3,
            x4,
            scaleY,
            y1,
            y2,
            y4,
            y6,
            lCylWidthHalf,
            lR,
            lx1,
            lx2,
            ly,
            l1Distance,
            l1x,
            l2x,
            fluidStroke,
            _3dAttr;

            if (isObject(x)) {
                y = x.y;
                r = x.r;
                h = x.h;
                renderer = x.renderer;
                fluidHRatio = x.fluidHRatio;
                conColor = x.conColor;
                conBorderColor = x.conBorderColor;
                conBorderThickness = x.conBorderThickness;
                fluidColor = x.fluidColor;
                fluidAlpha = x.fluidAlpha;
                is2D = x.is2D;
                x = x.x;
            }

            if (!(fluidHRatio >= 0 && fluidHRatio <= 1)) {
                fluidHRatio = 0;
            }
            conColor = pluck(conColor, 'FFFFFF');
            conBorderColor = pluck(conBorderColor, '#000000');

            conBorderThickness = pluckNumber(conBorderThickness, 1);
            fluidColor = pluck(fluidColor, '000000');
            fluidAlpha = pluckNumber(fluidAlpha, 100);
            fluidStroke = 3;
            _3dAttr = {
                x : x,
                y : y,
                r : r,
                h : h,
                renderer : renderer,
                fluidHRatio : fluidHRatio,
                conColor : conColor,
                conBorderColor : conBorderColor,
                conBorderThickness : conBorderThickness,
                fluidStroke : fluidStroke,
                fluidColor : fluidColor,
                is2D: is2D,
                fluidAlpha : fluidAlpha
            };


            //modify the attr function of the group so that it can handle pyramid attrs
            //store the old function
            thGroup._attr = thGroup.attr;
            thGroup.attr = attr;
            thGroup._setAnimate = setAnimate;

            // Replace the shadow function with a modified version.
            thGroup.shadow = shadow;

            //store the 3d attr(requared in new attr function to change any related
            //                  attr modiffiaction)
            thGroup._3dAttr = _3dAttr;

            //draw cylender
            darkColor = getDarkColor(conColor, 80);
            darkFlColor = getDarkColor(fluidColor, is2D ? 80 : 70);
            lightColor = getLightColor(conColor, 80);
            cos50 = 0.643;
            sin50 = 0.766;
            cylinderWidthHalf = r * cos50;
            scaleTop = cylinderWidthHalf;
            topRoundR = cylinderWidthHalf * 0.33;
            topRoundRDistance = cylinderWidthHalf - topRoundR;
            bulbCenterDistance = r * sin50;
            x1 = x - cylinderWidthHalf;
            x2 = x + cylinderWidthHalf;
            x3 = x - topRoundRDistance;
            x4 = x + topRoundRDistance;
            scaleY = y + scaleTop;
            y1 = scaleY + h;
            y2 = y1 + bulbCenterDistance;
            y4 = y + topRoundR;
            y6 = scaleY + (h * (1 - fluidHRatio));
            lCylWidthHalf = cylinderWidthHalf * 0.9;
            lR = r + lCylWidthHalf - cylinderWidthHalf;
            lx1 = x - lCylWidthHalf;
            lx2 = x + lCylWidthHalf;
            ly = y2 - Math.abs(Math.sqrt((lR * lR) - (lCylWidthHalf * lCylWidthHalf)));
            l1Distance = cylinderWidthHalf * 0.6;
            l1x = parseInt(x - l1Distance, 10);
            l2x = x + (cylinderWidthHalf / 2);


            //save the fluid path for further use
            _3dAttr.fluidPath = [M, lx1, ly, A, lR, lR, 0, 1, 0, lx2, ly];
            _3dAttr.scaleY = scaleY;
            _3dAttr.lx1 = lx1;
            _3dAttr.lx2 = lx2;
            _3dAttr.lCylWidthHalf = lCylWidthHalf;

            thGroup.topLight = renderer.path([M, lx1, scaleY, L, lx2, scaleY], thGroup)
            .attr({
                'stroke-width' : 1,
                stroke : convertColor(darkFlColor, 40)
            });

            thGroup.topLightBorder = renderer.path([M, lx1, scaleY, L, lx2, scaleY, lx2, y4, lx1, y4, Z], thGroup)
            .attr({
                'stroke-width' : 0,
                fill : toRaphaelColor({
                    FCcolor : {
                        color: darkFlColor + COMMASTRING + darkFlColor,
                        alpha: is2D ? '0,0' : '40,0',
                        ratio: '0,80',
                        radialGradient: true,
                        cx : 0.5,
                        cy : 1,
                        r : '70%'
                    }
                })
            });

            //draw the Fluid
            thGroup.fluid = renderer.path(_3dAttr.fluidPath.concat([L, lx2, y6, lx1, y6, Z]), thGroup)
            .attr({
                'stroke-width' : 0,
                fill : convertColor(darkFlColor, fluidAlpha)
            });

            thGroup.fluidTop = renderer.path(blankArr.concat([M, lx1, y6, A, lCylWidthHalf,
                1, 0, 1, 0, lx2, y6, Z]), thGroup)
            .attr({
                'stroke-width' : 0,
                fill : convertColor(darkFlColor, fluidAlpha)
            });

            //draw the border
            thGroup.border = renderer.path(blankArr.concat([M, x3, y, A, topRoundR, topRoundR, 0, 0, 0, x1, y4],
                [L, x1, y1], [A, r, r, 0, 1, 0, x2, y1], [L, x2, y4],
                [A, topRoundR, topRoundR, 0, 0, 0, x4, y, Z]), thGroup)
            .attr({
                'stroke-width' : conBorderThickness,
                stroke : conBorderColor
            });

            if (!is2D) {
                //draw the right half


                thGroup.bulbBorderLight = renderer.path(blankArr.concat([M, x1, y1, A, r, r, 0, 0, 1, x2, y1],
                    [M, x2, y1, A, r, r, 0, 0, 0, x1, y1],
                    [M, x1, y1, A, r, r, 0, 1, 0, x2, y1, Z]), thGroup)
                .attr({
                    'stroke-width' : 0,
                    stroke : '#00FF00',
                    fill : toRaphaelColor({
                        FCcolor : {
                            cx: 0.5,
                            cy: 0.5,
                            r: '50%',
                            color :  darkColor + COMMASTRING + lightColor,
                            alpha : '0,50',
                            ratio : '78,30',
                            radialGradient : true
                        }
                    })
                });

                thGroup.bulbTopLight = renderer.path(blankArr.concat([M, x1, y1, A, r, r, 0, 0, 1, x2, y1],
                    [A, r, r, 0, 0, 0, x1, y1],
                    [A, r, r, 0, 1, 0, x2, y1, Z]), thGroup)
                .attr({
                    'stroke-width' : 0,
                    fill : toRaphaelColor({
                        FCcolor : {
                            cx: 0.3,
                            cy: 0.1,
                            r: '100%',
                            color :  lightColor + COMMASTRING + darkColor,
                            alpha : '60,0',
                            ratio : '0,30',
                            radialGradient : true
                        }
                    })
                });

                thGroup.bulbCenterLight = renderer.path(blankArr.concat([M, x1, y1, A, r, r, 0, 1, 0, x2, y1],
                    [A, r, r, 0, 0, 0, x1, y1],
                    [A, r, r, 0, 0, 1, x2, y1, Z]), thGroup)
                .attr({
                    'stroke-width' : 0,
                    fill : toRaphaelColor({
                        FCcolor : {
                            cx: 0.25,
                            cy: 0.7,
                            r: '100%',
                            color :  lightColor + COMMASTRING + darkColor,
                            alpha : '80,0',
                            ratio : '0,70',
                            radialGradient : true
                        }
                    })
                });


                //draw the left half light
                thGroup.cylLeftLight = renderer.path(blankArr.concat([M, x, y, L, x3, y],
                    [A, topRoundR, topRoundR, 0, 0, 0, x1, y4],
                    [L, x1, y1, x, y1, Z]), thGroup)
                .attr({
                    'stroke-width' : 0,
                    fill : toRaphaelColor({
                        FCcolor : {
                            color : lightColor + COMMASTRING + darkColor,
                            alpha : '50,0',
                            ratio : '0,80',
                            angle : 0
                        }
                    })
                });

                //draw the right half
                thGroup.cylRightLight = renderer.path(blankArr.concat([M, x1, y, L, x4, y],
                    [A, topRoundR, topRoundR, 0, 0, 1, x2, y4],
                    [L, x2, y1, x1, y1, Z]), thGroup)
                .attr({
                    'stroke-width' : 0,
                    fill : toRaphaelColor({
                        FCcolor : {
                            color : lightColor + COMMASTRING + darkColor + COMMASTRING + darkColor,
                            alpha : '50,0,0',
                            ratio : '0,40,60',
                            angle : 180
                        }
                    })
                });

                //draw the middleLight left half
                thGroup.cylLeftLight1 = renderer.path([M, l1x, y4, L, x1, y4, x1, y1, l1x, y1, Z], thGroup)
                .attr({
                    'stroke-width' : 0,
                    fill : toRaphaelColor({
                        FCcolor : {
                            color : lightColor + COMMASTRING + darkColor,
                            alpha : '60,0',
                            ratio : '0,100',
                            angle : 180
                        }
                    })
                });

                //draw the middleLight left half
                thGroup.cylRightLight1 = renderer.path([M, l1x - 0.01, y4, L, l2x, y4, l2x, y1, l1x - 0.01, y1, Z],
                    thGroup)
                .attr({
                    'stroke-width' : 0,
                    fill : toRaphaelColor({
                        FCcolor : {
                            color : lightColor + COMMASTRING + darkColor,
                            alpha : '60,0',
                            ratio : '0,100',
                            angle : 0
                        }
                    })
                });

            }

            return thGroup;
        };
    })(),

    drawCylinder = (function () {
        //list of attr that will handled here
        var attrList = {
            fluidHRatio : true,
            color : true,
            alpha : true,
            fill : true
        },
        blankArr = [],
        animDuration = 0,
        setAnimate = function (animation) {
            animDuration = Boolean(animation) ? animation.duration : 0;
        },
        attr = function (hash, val) {
            var key,
            value,
            element = this,
            color,
            alpha,
            colorObject,
            colorChanged = false,
            shapeChanged = false,
            attr3D = this._3dAttr,
            fluidDarkColor,
            fluidLightColor,
            lightColor,
            darkColor,
            alphaStr,
            x,
            r,
            fluidStroke,
            fluidStrHF,
            hF,
            x1,
            x2,
            x3,
            x4,
            y2,
            y3,
            r2,
            r3;

            // single key-value pair
            if (isString(hash) && defined(val)) {
                key = hash;
                hash = {};
                hash[key] = val;
            }

            // used as a getter: first argument is a string, second is undefined
            if (isString(hash)) {
                //if belongs from the list then handle here
                if (attrList[hash]) {
                    element = element._3dAttr[hash];
                }
                else {//else leve for the original attr
                    element = element._attr(hash);
                }

            // setter
            } else {
                for (key in hash) {
                    value = hash[key];

                    //if belongs from the list then handle here
                    if (attrList[key]) {
                        //if it is 'fill' or 'lighting3D' the redefine the colors for all the 3 elements
                        if (key === 'fill') {
                            if (value && value.linearGradient && value.stops && value.stops[0]) {
                                value = value.stops[0][1];
                            }

                            if (startsRGBA.test(value)) {
                                colorObject = new Color(value);
                                color = colorObject.get('hex');
                                alpha = colorObject.get('a') * 100;
                            }
                            else if (value && value.FCcolor) {
                                color = value.FCcolor.color.split(COMMASTRING)[0];
                                alpha = value.FCcolor.alpha.split(COMMASTRING)[0];
                            }
                            else if (HEXCODE.test(value)) {
                                color = value.replace(dropHash, HASHSTRING);
                            }
                            attr3D.fluidColor = pluck(color, attr3D.fluidColor, '000000');
                            attr3D.fluidAlpha = pluckNumber(alpha, attr3D.fluidAlpha, 100);
                            colorChanged = true;
                        }
                        else if (key === 'color') {
                            attr3D.fluidColor = pluck(value, attr3D.fluidColor, '000000');
                            colorChanged = true;
                        }
                        else if (key === 'alpha') {
                            attr3D.fluidAlpha = pluckNumber(value, attr3D.fluidAlpha, 100);
                            colorChanged = true;
                        }
                        else if (value >= 0 && value <= 1){
                            attr3D.fluidHRatio = value;
                            shapeChanged = true;
                        }
                        if (colorChanged) {
                            fluidDarkColor = getDarkColor(attr3D.fluidColor, 70);
                            fluidLightColor = getLightColor(attr3D.fluidColor, 70);
                            darkColor = getDarkColor(attr3D.conColor, 80);
                            lightColor = getLightColor(attr3D.conColor, 80);
                            alpha = attr3D.fluidAlpha;
                            alphaStr = alpha + COMMASTRING + alpha;
                            //draw the fluid fill
                            element.fluid.attr({
                                'stroke-width' : 0,
                                fill : toRaphaelColor({
                                    FCcolor : {
                                        cx: 0.5,
                                        cy: 0,
                                        r: '100%',
                                        color :  fluidLightColor + COMMASTRING + fluidDarkColor,
                                        alpha : alphaStr,
                                        ratio : '0,100',
                                        radialGradient : true
                                    }
                                })
                            });

                            //draw the fluid top
                            element.fluidTop.attr({
                                'stroke-width' : 3,
                                stroke : convertColor(fluidLightColor, alpha),
                                fill : toRaphaelColor({
                                    FCcolor : {
                                        cx: 0.5,
                                        cy: 0.7,
                                        r: '100%',
                                        color :  fluidLightColor + COMMASTRING + fluidDarkColor,
                                        alpha : alphaStr,
                                        ratio : '0,100',
                                        radialGradient : true
                                    }
                                })
                            });

                            element.btnBorderLight.attr({
                                fill : toRaphaelColor({
                                    FCcolor : {
                                        color : lightColor + COMMASTRING + darkColor + COMMASTRING + lightColor +
                                        COMMASTRING + lightColor + COMMASTRING + darkColor + COMMASTRING +
                                        fluidDarkColor + COMMASTRING + darkColor + COMMASTRING + lightColor,
                                        alpha : '50,50,50,50,50,'+ (alpha * 0.7) + ',50,50',
                                        ratio : '0,15,0,12,0,15,43,15',
                                        angle : 0
                                    }
                                })
                            });
                        }
                        if (shapeChanged) {
                            x = attr3D.x;
                            r = attr3D.r;
                            fluidStroke = attr3D.fluidStroke;
                            fluidStrHF = fluidStroke / 2;
                            hF = attr3D.h * attr3D.fluidHRatio;
                            x1 = x - r;
                            x2 = x + r;
                            x3 = x1 + fluidStrHF;
                            x4 = x2 - fluidStrHF;
                            y2 = attr3D.y + attr3D.h;
                            y3 = y2 - hF;
                            r2 = r * attr3D.r3dFactor;
                            r3 = r - fluidStrHF;
                            //draw the fluid fill

                            if (animDuration) {
                                element.fluid.animate({
                                    path: blankArr.concat([M, x1, y2], [A, r, r2, 0, 0, 0, x2, y2],
                                        [L, x2, y3], [A, r, r2, 0, 0, 1, x1, y3, Z])
                                }, animDuration, ANIM_EFFECT);

                                //draw the fluid top
                                element.fluidTop.animate({
                                    path: blankArr.concat([M, x3, y3], [A, r3, r2, 0, 0, 0, x4, y3],
                                        [L, x4, y3], [A, r3, r2, 0, 0, 0, x3, y3, Z])
                                }, animDuration, ANIM_EFFECT);
                            }
                            else {
                                element.fluid.attr({
                                    path: blankArr.concat([M, x1, y2], [A, r, r2, 0, 0, 0, x2, y2],
                                        [L, x2, y3], [A, r, r2, 0, 0, 1, x1, y3, Z])
                                });

                                //draw the fluid top
                                element.fluidTop.attr({
                                    path: blankArr.concat([M, x3, y3], [A, r3, r2, 0, 0, 0, x4, y3],
                                        [L, x4, y3], [A, r3, r2, 0, 0, 0, x3, y3, Z])
                                });
                            }
                        }
                    }
                    else {//else leave for the original attr
                        this._attr(key, value);
                    }
                }
            }
            return element;
        },

        shadow = function () {
        };

        return function (x, y, r, h, r3dFactor, parentGroup, renderer, fluidHRatio,
            conColor, conAlpha, fluidColor, fluidAlpha) {

            var r2,
            fluidStrHF,
            r3,
            y2,
            hF,
            y3,
            x1,
            x2,
            x3,
            x4,
            xBt1,
            xBt2,
            rBt1,
            rBt2,
            yBt1,
            yBt2,
            yBt3,
            darkColor,
            darkColor1,
            lightColor,
            fluidDarkColor,
            fluidLightColor,
            lightX,
            x5,
            x6,
            lightY,
            y4,
            y5,
            y6,
            fluidStroke,
            _3dAttr,
            cylinder;


            if (isObject(x)) {
                y = x.y;
                r = x.r;
                h = x.h;
                r3dFactor = x.r3dFactor;
                parentGroup = x.parentGroup;
                renderer = x.renderer;
                fluidHRatio = x.fluidHRatio;
                conColor = x.conColor;
                conAlpha = x.conAlpha;
                fluidColor = x.fluidColor;
                fluidAlpha = x.fluidAlpha;
                x = x.x;
            }
            r3dFactor = pluckNumber(r3dFactor, 0.15);
            if (!(fluidHRatio >= 0 && fluidHRatio <= 1)) {
                fluidHRatio = 0;
            }
            conColor = pluck(conColor, 'FFFFFF');
            conAlpha = pluckNumber(conAlpha, 30);
            fluidColor = pluck(fluidColor, '000000');
            fluidAlpha = pluckNumber(fluidAlpha, 100);
            fluidStroke = 3;
            _3dAttr = {
                x : x,
                y : y,
                r : r,
                h : h,
                r3dFactor : r3dFactor,
                renderer : renderer,
                fluidHRatio : fluidHRatio,
                conColor : conColor,
                conAlpha : conAlpha,
                fluidStroke : fluidStroke,
                fluidColor : fluidColor,
                fluidAlpha : fluidAlpha
            };
            cylinder = renderer.group('graphic', parentGroup);

            //modify the attr function of the group so that it can handle pyramid attrs
            //store the old function
            cylinder._attr = cylinder.attr;
            cylinder.attr = attr;
            cylinder._setAnimate = setAnimate;
            // Replace the shadow function with a modified version.
            cylinder.shadow = shadow;

            //store the 3d attr(requared in new attr function to change any related
            //                  attr modiffiaction)
            cylinder._3dAttr = _3dAttr;

            //draw cylender
            r2 = r * r3dFactor;
            fluidStrHF = fluidStroke / 2;
            r3 = r - fluidStrHF;
            y2 = y + h;
            hF = h * fluidHRatio;
            y3 = y2 - hF;
            x1 = x - r;
            x2 = x + r;
            x3 = x1 + fluidStrHF;
            x4 = x2 - fluidStrHF;
            xBt1 = x1 - 2;
            xBt2 = x2 + 2;
            rBt1 = r + 2;
            rBt2 = r2 + 2;
            yBt1 = y2 + 4;
            yBt2 = yBt1 + 0.001;
            yBt3 = yBt1 + 1;
            darkColor = getDarkColor(conColor, 80);
            darkColor1 = getDarkColor(conColor, 90);
            lightColor = getLightColor(conColor, 80);
            fluidDarkColor = getDarkColor(fluidColor, 70);
            fluidLightColor = getLightColor(fluidColor, 70);
            lightX = r * 0.85;
            x5 = x - lightX;
            x6 = x + lightX;
            lightY = Math.sqrt((1 - ((lightX * lightX) / (r * r))) * r2 * r2);
            y4 = y + lightY;



            y5 = y2 + lightY;
            y6 = y - 1;

            //draw the bottom border
            cylinder.btnBorder = renderer.path(blankArr.concat([M, xBt1, yBt1], [A, rBt1, rBt2, 0, 0, 0, xBt2, yBt1],
                [L, xBt2, yBt2], [A, rBt1, rBt2, 0, 0, 0, xBt1, yBt2, Z]), cylinder)
            .attr({
                'stroke-width' : 4,
                stroke : convertColor(darkColor, 80)
            });

            //draw the bottom border1
            cylinder.btnBorder1 = renderer.path(blankArr.concat([M, x1, yBt1], [A, r, r2, 0, 0, 0, x2, yBt1],
                [L, x2, yBt2], [A, r, r2, 0, 0, 0, x1, yBt2, Z]), cylinder)
            .attr({
                'stroke-width' : 4,
                stroke : convertColor(darkColor, 50)
            });

            //draw the bottom border light
            cylinder.btnBorderLight = renderer.path(blankArr.concat([M, x1, y2], [A, r, r2, 0, 0, 0, x2, y2],
                [L, x2, yBt3], [A, r, r2, 1, 0, 0, x1, yBt3, Z]), cylinder)
            .attr({
                'stroke-width' : 0,
                fill : toRaphaelColor({
                    FCcolor : {
                        color : lightColor + COMMASTRING + darkColor + COMMASTRING + lightColor +
                        COMMASTRING + lightColor + COMMASTRING + darkColor + COMMASTRING +
                        fluidDarkColor + COMMASTRING + darkColor + COMMASTRING + lightColor,
                        alpha : '50,50,50,50,50,70,50,50',
                        ratio : '0,15,0,12,0,15,43,15',
                        angle : 0
                    }
                })
            });

            //draw the back side
            cylinder.back = renderer.path(blankArr.concat([M, x1, y2], [A, r, r2, 1, 0, 0, x2, y2],
                [L, x2, y], [A, r, r2, 0, 0, 0, x1, y, Z]), cylinder)
            .attr({
                'stroke-width' : 1,
                stroke : convertColor(darkColor, 50),
                fill : toRaphaelColor({
                    FCcolor : {
                        color : lightColor + COMMASTRING + darkColor + COMMASTRING + lightColor +
                            COMMASTRING + darkColor + COMMASTRING + darkColor1 + COMMASTRING +
                            darkColor1 + COMMASTRING + darkColor + COMMASTRING + lightColor,
                        alpha : '30,30,30,30,30,30,30,30',
                        ratio : '0,15,43,15,0,12,0,15',
                        angle : 0
                    }
                })
            });

            //draw the fluid fill
            cylinder.fluid = renderer.path(blankArr.concat([M, x1, y2], [A, r, r2, 0, 0, 0, x2, y2],
                [L, x2, y3], [A, r, r2, 1, 0, 1, x1, y3, Z]), cylinder)
            .attr({
                'stroke-width' : 0,
                fill : toRaphaelColor({
                    FCcolor : {
                        cx: 0.5,
                        cy: 0,
                        r: '100%',
                        color :  fluidLightColor + COMMASTRING + fluidDarkColor,
                        alpha : fluidAlpha + COMMASTRING + fluidAlpha ,
                        ratio : '0,100',
                        radialGradient : true
                    }
                })
            });

            //draw the fluid top
            cylinder.fluidTop = renderer.path(blankArr.concat([M, x3, y3], [A, r3, r2, 0, 0, 0, x4, y3],
                [L, x4, y3], [A, r3, r2, 0, 0, 0, x3, y3, Z]), cylinder)
            .attr({
                'stroke-width' : 3,
                stroke : convertColor(fluidLightColor, fluidAlpha),
                fill : toRaphaelColor({
                    FCcolor : {
                        cx: 0.5,
                        cy: 0.7,
                        r: '100%',
                        color :  fluidLightColor + COMMASTRING + fluidDarkColor,
                        alpha : fluidAlpha + COMMASTRING + fluidAlpha ,
                        ratio : '0,100',
                        radialGradient : true
                    }
                })
            });

            //draw the front side
            cylinder.front = renderer.path(blankArr.concat([M, x1, y2], [A, r, r2, 0, 0, 0, x2, y2],
                [L, x2, y], [A, r, r2, 0, 0, 1, x1, y, Z]), cylinder)
            .attr({
                'stroke-width' : 1,
                stroke : convertColor(darkColor, 50),
                fill : toRaphaelColor({
                    FCcolor : {
                        color : lightColor + COMMASTRING + darkColor + COMMASTRING + lightColor +
                        COMMASTRING + lightColor + COMMASTRING + darkColor + COMMASTRING +
                        lightColor + COMMASTRING + darkColor + COMMASTRING + lightColor,
                        alpha : '30,30,30,30,30,30,30,30',
                        ratio : '0,15,0,12,0,15,43,15',
                        angle : 0
                    }
                })
            });

            //draw the front light left
            cylinder.frontLight = renderer.path(blankArr.concat([M, x1, y2], [A, r, r2, 1, 0, 0, x5, y5],
                [L, x5, y4], [A, r, r2, 0, 0, 1, x1, y, Z]), cylinder)
            .attr({
                'stroke-width' : 0,
                stroke : '#' + darkColor,
                fill : toRaphaelColor({
                    FCcolor : {
                        color : lightColor + COMMASTRING + darkColor,
                        alpha : '40,0',
                        ratio : '0,100',
                        angle : 0
                    }
                })
            });

            //draw the front light right
            cylinder.frontLight1 = renderer.path(blankArr.concat([M, x6, y5], [A, r, r2, 0, 0, 0, x2, y2],
                [L, x2, y], [A, r, r2, 1, 0, 0, x6, y4, Z]), cylinder)
            .attr({
                'stroke-width' : 0,
                stroke : '#' + darkColor,
                fill : toRaphaelColor({
                    FCcolor : {
                        color : lightColor + COMMASTRING + darkColor,
                        alpha : '40,0',
                        ratio : '0,100',
                        angle : 180
                    }
                })
            });

            //draw the cylender top line
            cylinder.cylinterTop = renderer.path(blankArr.concat([M, x1, y6], [A, r, r2, 0, 0, 0, x2, y6],
                [L, x2, y6], [A, r, r2, 0, 0, 0, x1, y6, Z]), cylinder)
            .attr({
                'stroke-width' : 2,
                stroke : convertColor(darkColor, 40)
            });

            return cylinder;
        };

    })(),

    drawLED = (function () {
        //list of attr that will handled here
        var attrList = {
            value : true
        },
        animDuration = 0,
        setAnimate = function (animation) {
            animDuration = Boolean(animation) ? animation.duration : 0;
        },
        attr = function (hash, val) {
            var key,
            value,
            element = this,
            attr3D = this._3dAttr,
            lightedLed,
            lightedLedLength,
            colorArr,
            i,
            ln,
            colorObj,
            hoverZone, hideShowFN,
            darkShadeAttr;

            // single key-value pair
            if (isString(hash) && defined(val)) {
                key = hash;
                hash = {};
                hash[key] = val;
            }

            // used as a getter: first argument is a string, second is undefined
            if (isString(hash)) {
                //if belongs from the list then handle here
                if (attrList[hash]) {
                    element = element._3dAttr[hash];
                }
                else {//else leve for the original attr
                    element = element._attr(hash);
                }

            // setter
            }else {
                for (key in hash) {
                    value = hash[key];

                    //if belongs from the list then handle here
                    if (attrList[key]) {
                        if (value >= attr3D.minValue && value <= attr3D.maxValue) {
                            //store for getter
                            attr3D[key] = value;
                            lightedLed = (value - attr3D.minValue) / attr3D.perLEDValueLength;
                            lightedLedLength  = (mathRound(lightedLed) * attr3D.sizeGapSum) - attr3D.ledGap;
                            if (attr3D.LEDCase) {
                                colorArr = element.colorArr;
                                i = 0;
                                ln = colorArr.length;
                                for (i = 0; i < ln; i += 1) {
                                    colorObj = colorArr[i];
                                    if (colorObj.maxLEDNoFrac <= lightedLed) {
                                        hideShowFN = attr3D.LEDLowerFN;
                                    }
                                    else if (!hoverZone) {
                                        hideShowFN = undefined;
                                        hoverZone = colorObj;
                                    }
                                    else {
                                        hideShowFN = attr3D.LEDUpperFN;
                                    }
                                    if (hideShowFN) {
                                        colorObj[hideShowFN]();
                                        if (hideShowFN === 'show') {
                                            colorObj.attr(colorObj.oriShapeArg );
                                        }
                                    }
                                }
                                //fix FWXT-255 issue
                                if (!hoverZone) {
                                    hoverZone = colorObj;
                                }
                                hoverZone.show();
                                hoverZone.attr(hoverZone.hoverShapeArg);
                            }

                            //position the darkShade
                            if (element.darkShade) {
                                darkShadeAttr = {};
                                if (attr3D.isXChange) {
                                    darkShadeAttr.width = Math.ceil(attr3D.w - lightedLedLength);
                                    if (attr3D.isIncrement) {
                                        darkShadeAttr.x = attr3D.x + lightedLedLength;
                                    }
                                }
                                else {
                                    darkShadeAttr.height = Math.ceil(attr3D.h - lightedLedLength);
                                    if (attr3D.isIncrement) {
                                        darkShadeAttr.y = attr3D.y + lightedLedLength;
                                    }
                                }
                                if (animDuration) {
                                    element.darkShade.animate(
                                        darkShadeAttr,
                                        animDuration,
                                        ANIM_EFFECT
                                    );
                                }
                                else {
                                    element.darkShade.attr(darkShadeAttr);
                                }
                            }
                        }
                    }
                    else {//else leave for the original attr
                        this._attr(key, value);
                    }
                }
            }
            return element;
        },

        shadow = function () {
        };

        //type [1=> L to R, 2=> T to B, 3 => R to L, 4 => B to T]
        return function (x, y, w, h, wGroup, renderer, value, gaugeFillColor,
            gaugeBorderColor, gaugeBorderAlpha, gaugeBorderThickness, colorRangeManager, minValue,
            maxValue, useSameFillColor, useSameFillBgColor, ledSize, ledGap, type, showShadow, showHoverEffect) {

            var rolloverResponseSetter = function (wrapper) {
                    var i = 0,
                        len,
                        ele;

                    return function () {
                        for (i = 0, len = wrapper.colorArr.length; i < len; i += 1) {
                            ele = wrapper.colorArr[i];
                            ele.attr(ele.data('rollover'));
                        }
                    };
                },
                rolloutResponseSetter = function (wrapper) {
                    var i = 0,
                        len,
                        ele;

                    return function () {
                        for (i = 0, len = wrapper.colorArr.length; i < len; i += 1) {
                            ele = wrapper.colorArr[i];
                            ele.attr(ele.data('rollout'));
                        }
                    };
                },
                colorRange,
                lastX,
                lastY,
                isIncrement,
                isXChange,
                LEDlength,
                sizeGapSum,
                ledGapHalf,
                ledGapQuarter,
                remaningLength,
                noOfLED,
                valueDistance,
                perLEDValueLength,
                pathCommand,
                colorObj,
                i, ln,
                extraSpace,
                colorLED,
                colorLEDLength,
                colorLedLengthPX,
                oriShapeArg,
                hoverShapeArg,
                colorRect,
                LEDDrawn,
                LEDCase,
                changeHoverArgs,
                LEDLowerFN,
                LEDUpperFN,
                LEDGapStartX,
                LEDGapStartY,
                halfBorderWidth,
                x1,
                y1,
                x2,
                y2,
                wrapperAttr,
                wrapper;


            if (isObject(x)) {
                y = x.y;
                w = x.w;
                h = x.h;
                wGroup = x.wGroup;
                renderer = x.renderer;
                value = x.value;
                gaugeFillColor = x.gaugeFillColor;
                gaugeBorderColor = x.gaugeBorderColor;
                gaugeBorderAlpha = x.gaugeBorderAlpha;
                gaugeBorderThickness = x.gaugeBorderThickness;
                colorRangeManager = x.colorRangeManager;
                minValue = x.minValue;
                maxValue = x.maxValue;
                useSameFillColor = x.useSameFillColor;
                useSameFillBgColor = x.useSameFillBgColor;
                ledSize = x.ledSize;
                ledGap = x.ledGap;
                type = x.type;
                x = x.x;
            }
            if (!(value >= minValue && value <= maxValue)) {
                value = minValue;
            }
            gaugeFillColor = pluck(gaugeFillColor, 'FFFFFF');
            gaugeBorderColor = pluck(gaugeBorderColor, '000000').replace(dropHash, HASHSTRING);
            gaugeBorderAlpha = pluckNumber(gaugeBorderAlpha, 1);
            gaugeBorderThickness = pluckNumber(gaugeBorderThickness, 2);
            wrapperAttr = {
                x : x,
                y : y,
                w : w,
                h : h,
                wGroup : wGroup,
                renderer : renderer,
                value : value,
                gaugeFillColor : gaugeFillColor,
                gaugeBorderColor : gaugeBorderColor,
                gaugeBorderAlpha : gaugeBorderAlpha,
                gaugeBorderThickness : gaugeBorderThickness,
                colorRangeManager : colorRangeManager,
                minValue : minValue,
                maxValue : maxValue,
                ledGap : ledGap,
                ledSize : ledSize,
                type : type,
                useSameFillColor : useSameFillColor,
                useSameFillBgColor : useSameFillBgColor
            },
            wrapper = renderer.group('graphic', wGroup);

            //modify the attr function of the group so that it can handle pyramid attrs
            //store the old function
            wrapper._attr = wrapper.attr;
            wrapper.attr = attr;
            wrapper._setAnimate = setAnimate;

            // Replace the shadow function with a modified version.
            wrapper.shadow = shadow;

            //store the 3d attr(requared in new attr function to change any related
            //                  attr modiffiaction)
            wrapper._3dAttr = wrapperAttr;

            //draw leds
            colorRange = colorRangeManager.getColorRangeArr(minValue, maxValue);
            lastX = x;
            lastY = y;
            isIncrement = true;
            isXChange = true;

            LEDlength = (type === 2 || type === 4) ? h : w;
            sizeGapSum = ledGap + ledSize;
            ledGapHalf = ledGap / 2;
            ledGapQuarter = ledGapHalf / 2;
            remaningLength = LEDlength - ledSize;
            valueDistance = maxValue - minValue;
            //perLEDValueLength;
            //pathCommand;
            //colorObj;
            i = 0;
            ln = colorRange.length;
            extraSpace = 0;
            //colorLED;

            LEDDrawn = 0;
            LEDCase = 0;
            changeHoverArgs = false;
            LEDLowerFN = 'show';
            LEDUpperFN = 'show';
            LEDGapStartX = x;
            LEDGapStartY = y;
            halfBorderWidth = gaugeBorderThickness / 2;
            x1 = x - halfBorderWidth;
            y1 = y - halfBorderWidth;
            x2 = x + w + halfBorderWidth;
            y2 = y + h + halfBorderWidth;

            if (useSameFillColor) {
                LEDCase += 1;
                LEDLowerFN = 'hide';
            }
            if (useSameFillBgColor) {
                LEDCase += 2;
                LEDUpperFN = 'hide';
            }

            if (remaningLength < 0) {
                noOfLED = 1;
                ledSize = LEDlength;
            }
            else {
                noOfLED =  parseInt(remaningLength / sizeGapSum, 10) + 1;
                extraSpace = remaningLength % sizeGapSum;
                //devide the extra space amont all the LED
                ledSize += extraSpace / noOfLED;
                sizeGapSum = ledSize + ledGap;
            }
            perLEDValueLength = valueDistance / noOfLED;
            wrapper.colorArr = [];
            pathCommand = [];
            if (type === 1) {
                LEDGapStartX += sizeGapSum - (ledGap / 2);
            }
            else if (type === 2) {
                isXChange = false;
                LEDGapStartY += sizeGapSum - (ledGap / 2);

            }
            else if (type === 3) {
                lastX = x + w;
                isIncrement = false;
                LEDGapStartX += sizeGapSum - (ledGap / 2);

            }
            else {
                lastY = y + h;
                isIncrement = false;
                isXChange = false;
                LEDGapStartY += sizeGapSum - (ledGap / 2);

            }

            //store the attribute
            wrapperAttr.ledGap = ledGap;
            wrapperAttr.ledSize = ledSize;
            wrapperAttr.sizeGapSum = sizeGapSum;
            wrapperAttr.perLEDValueLength = perLEDValueLength;
            wrapperAttr.isIncrement = isIncrement;
            wrapperAttr.isXChange = isXChange;
            wrapperAttr.LEDLowerFN = LEDLowerFN,
            wrapperAttr.LEDUpperFN = LEDUpperFN;
            wrapperAttr.LEDCase = LEDCase;


            if (LEDCase) {
                if (LEDCase === 3) {
                    hoverShapeArg = {
                        x : x,
                        y : y,
                        width : w,
                        height : h
                    };
                }
                else {
                    changeHoverArgs = true;
                }
            }

            //draw the border on top of every of thing
            wrapper.border = renderer.path([M, x1, y1, L, x2, y1, x2, y2, x1, y2, Z], wrapper)
            .attr({
                stroke: convertColor(gaugeBorderColor, gaugeBorderAlpha),
                'stroke-width': gaugeBorderThickness
            })
            .shadow({
                apply: showShadow
            });

            //draw all color range and create the path command for gap
            for (; i < ln; i += 1) {
                colorObj = colorRange[i];
                if (colorObj && defined(colorObj.maxvalue)){
                    colorLED = mathRound((colorObj.maxvalue - minValue) / perLEDValueLength);
                    colorLEDLength = colorLED - LEDDrawn;
                    LEDDrawn = colorLED;
                    if (colorLEDLength > 0) {
                        oriShapeArg = {
                            r : 0
                        };
                        if (changeHoverArgs) {
                            hoverShapeArg = {};
                        }

                        colorLedLengthPX =  colorLEDLength * sizeGapSum;
                        if (isXChange) {
                            oriShapeArg.y = lastY;
                            oriShapeArg.width = colorLedLengthPX - ledGap;
                            oriShapeArg.height = h;
                            if (isIncrement) {
                                oriShapeArg.x =  lastX;
                                lastX += colorLedLengthPX;
                            }
                            else {
                                oriShapeArg.x =  lastX - oriShapeArg.width;
                                lastX -= colorLedLengthPX;
                            }

                            if (changeHoverArgs) {
                                hoverShapeArg.width = oriShapeArg.x - x;
                                if ((isIncrement && LEDCase === 1) || (!isIncrement && LEDCase === 2)) {
                                    hoverShapeArg.x = x;
                                    hoverShapeArg.width += oriShapeArg.width;
                                }
                                else {
                                    hoverShapeArg.width = w - hoverShapeArg.width;
                                }
                            }
                            //fix FWXT-415
                            if (i === 0 || i === ln -1) {
                                oriShapeArg.width += ledGapQuarter;
                                if ((isIncrement && i === ln -1) || (!isIncrement && i === 0)) {
                                    oriShapeArg.x -=  ledGapQuarter;
                                    oriShapeArg.width = Math.ceil(oriShapeArg.width);
                                }
                            }
                            else {
                                oriShapeArg.width += ledGapHalf;
                                oriShapeArg.x -=  ledGapQuarter;
                            }
                        }
                        else {
                            oriShapeArg.x = lastX;
                            oriShapeArg.width = w;
                            oriShapeArg.height = colorLedLengthPX - ledGap;
                            if (isIncrement) {
                                oriShapeArg.y =  lastY;
                                lastY += colorLedLengthPX;
                            }
                            else {
                                oriShapeArg.y =  lastY - oriShapeArg.height;
                                lastY -= colorLedLengthPX;
                            }
                            if (changeHoverArgs) {
                                hoverShapeArg.height = oriShapeArg.y - y;
                                if ((isIncrement && LEDCase === 1) || (!isIncrement && LEDCase === 2)) {
                                    hoverShapeArg.y = y;
                                    hoverShapeArg.height += oriShapeArg.height;
                                }
                                else {
                                    hoverShapeArg.height = h - hoverShapeArg.height;
                                }
                            }
                            //fix FWXT-415
                            if (i === 0 || i === ln -1) {
                                oriShapeArg.height += ledGapQuarter;
                                if ((isIncrement && i === ln -1) || (!isIncrement && i === 0)) {
                                    oriShapeArg.y -=  ledGapQuarter;
                                    oriShapeArg.height = Math.ceil(oriShapeArg.height);
                                }
                            }
                            else {
                                oriShapeArg.height += ledGapHalf;
                                oriShapeArg.y -=  ledGapQuarter;
                            }
                        }

                        colorRect = renderer.rect(oriShapeArg.x, oriShapeArg.y,
                            oriShapeArg.width, oriShapeArg.height, wrapper)
                        .attr ({
                            'stroke-width' : 0,
                            fill : toRaphaelColor({
                                FCcolor: {
                                    color: pluck(colorObj.code, '000000'),
                                    alpha: pluckNumber(colorObj.alpha, 100)
                                }
                            })
                        });

                        colorRect.oriShapeArg = oriShapeArg;
                        colorRect.hoverShapeArg = hoverShapeArg;
                        colorRect.maxLEDNo = colorLED;
                        colorRect.maxLEDNoFrac = (colorObj.maxvalue - minValue) / perLEDValueLength;
                        if (showHoverEffect) {
                            // Store rollover attribute in element data
                            colorRect.data('rollover', {
                                'stroke-width' : 0,
                                fill : toRaphaelColor({
                                    FCcolor: {
                                        color: getDarkColor(pluck(colorObj.code, '000000'), 80) + ',' +
                                                getLightColor(pluck(colorObj.code, '000000'), 80),
                                        alpha: pluckNumber(colorObj.alpha, 100),
                                        angle: type % 2 ? 90 : 0
                                    }
                                })
                            });
                            // Store rollout attribute in element data
                            colorRect.data('rollout', {
                                'stroke-width' : 0,
                                fill : toRaphaelColor({
                                    FCcolor: {
                                        color: pluck(colorObj.code, '000000'),
                                        alpha: pluckNumber(colorObj.alpha, 100)
                                    }
                                })
                            });
                        }
                        wrapper.colorArr.push(colorRect);
                    }
                }
            }

            //draw the dark rect
            wrapper.darkShade = renderer.rect(x, y, w, h, 0, wrapper)
            .attr({
                'stroke-width': 0,
                fill : convertColor(gaugeFillColor, 50)
            });


            //Draw the path for the gap
            for (i = 1; i < noOfLED; i += 1) {
                if (isXChange) {
                    pathCommand.push(M, LEDGapStartX, LEDGapStartY, L, LEDGapStartX, LEDGapStartY + h);
                    LEDGapStartX += sizeGapSum;
                }
                else {
                    pathCommand.push(M, LEDGapStartX, LEDGapStartY, L, LEDGapStartX + w, LEDGapStartY);
                    LEDGapStartY += sizeGapSum;
                }
            }

            wrapper.LEDGap = renderer.path(pathCommand, wrapper)
            .attr({
                stroke: convertColor(gaugeFillColor, 100),
                'stroke-width': ledGap
            });

            // Draw tracker
            wrapper.tracker = renderer.rect(x, y, w, h, 0, wrapper)
            .attr({
                fill: TRACKER_FILL
            });
            if (showHoverEffect) {
                wrapper.tracker.hover(rolloverResponseSetter(wrapper),
                    rolloutResponseSetter(wrapper));
            }
            wrapper.attr({
                value : value
            });

            return wrapper;
        };
    })();

    renderer('renderer.drawingpad', {
        /** @todo testing code. must be removed. */
        deleteme: function (str) {
            this.container.innerHTML = 'called from drawingpad: ' + str;
        }
    }, renderer['renderer.root']);

    renderer('renderer.widgetbase', {

        drawLegend: function () {
            // To be overriden.
        },

        drawGraph: function () {

            var renderer = this,
            elements = renderer.elements,
            paper = renderer.paper,
            layers = renderer.layers,
            options = renderer.options,
            wGroup = layers.dataset;

            // Return in case the data is being retrieved.
            if (options.nativeMessage) {
                return;
            }

            if (!layers.dataset) {
                wGroup = elements.widgetGroup = layers.dataset = paper.group('dataset');
                layers.tracker = paper.group('hot');
                layers.tracker.insertAfter(layers.dataset);
            }

            if (!layers.datalabels) {
                layers.datalabels = paper.group('datalabels').insertAfter(wGroup);
            }

            wGroup.translate(renderer.canvasLeft, renderer.canvasTop);
            layers.datalabels.translate(renderer.canvasLeft, renderer.canvasTop);

            options.tooltip && (options.tooltip.enabled !== false) &&
                paper.tooltip(options.tooltip.style, options.tooltip.shadow, options.tooltip.constrain);

            renderer.drawWidget();

            renderer.drawScale();

            renderer.drawValue();

        },

        drawWidgetValue: function () {
            // Override
        },

        drawValue: function (dataArr, animation) {

            var renderer = this,
            options = renderer.options,
            anim = animation || (options.plotOptions.series.animation),
            data = ((options.series && options.series[0] && options.series[0].data) || []),
            i;

            if (data.length) {
                if (dataArr && (i = dataArr.length)) {
                    while (i--) {
                        if (data[i]) {
                            data[i] = dataArr[i];
                        }
                    }
                }

                renderer.drawWidgetValue(data, anim);
                renderer.drawWidgetLabel(data, anim);
            }
        },

        drawWidgetLabel: function (dataArr) {
            var renderer = this,
            paper = renderer.paper,
            options = renderer.options,
            chartOptions = options.chart,
            elements = renderer.elements,
            layers = renderer.layers,
            dataPoint = dataArr[0],
            labelGroup = layers.datalabels || (layers.datalabels = paper.group('datalabels').
                insertAfter(layers.dataset)),
            width = renderer.canvasWidth,
            height = renderer.canvasHeight,
            valuePadding = chartOptions.valuePadding,
            displayValue = dataPoint.displayValue,
            // yScaleRadius is for Cylinder Chart, Cylinder is using the same drawDataLabels function
            yScaleRadius = pluckNumber(chartOptions.yScaleRadius, 0),
            style = options.plotOptions.series.dataLabels.style,
            css = {
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                lineHeight: style.lineHeight,
                fontWeight: style.fontWeight,
                fontStyle: style.fontStyle
            },
            labelY = height + valuePadding + yScaleRadius,
            labelBBox,
            labelWidth;

            // only draw the point if y is defined
            if (dataPoint.y !== null && !isNaN(dataPoint.y)) {

                if (defined(displayValue) && displayValue !== BLANK) {
                    if (!elements.dataLabel) {
                        elements.dataLabel = paper.text(labelGroup)
                        .attr({
                            'vertical-align': 'top',
                            text: displayValue,
                            x: width / 2,
                            y: labelY,
                            'text-anchor': textHAlign[POSITION_MIDDLE], /** @todo get from dataLabels.align */
                            fill: style.color,
                            title: (dataPoint.originalText || ''),
                            'text-bound': [style.backgroundColor, style.borderColor,
                                style.borderThickness, style.borderPadding,
                                style.borderRadius, style.borderDash]
                        })
                        .css(css);
                    }
                    else {
                        elements.dataLabel.attr({
                            text: displayValue
                        });
                    }
                    // Adjusting the chart label if goes out side the chart area
                    // we try to keep the label inside viewport
                    labelBBox = elements.dataLabel.getBBox();
                    if (labelBBox.x + chartOptions.spacingLeft < 0) {
                        labelWidth = labelBBox.width - chartOptions.spacingLeft;
                        if(chartOptions.origW < labelWidth) {
                            labelWidth = chartOptions.origW - chartOptions.spacingLeft;
                        }
                        elements.dataLabel.attr({
                            x : labelWidth/2
                        });
                    }
                }
            }
        },

        drawScale: function () {
            // Drawing of TickMarks and Tick Labels
            var renderer = this,
            paper = renderer.paper,
            elements = renderer.elements,
            layers = renderer.layers,
            wGroup = layers.dataset,
            options = renderer.options,
            width = renderer.canvasWidth,
            height = renderer.canvasHeight,
            scale = options.scale,
            minorTM = scale.minorTM,
            min = scale.min,
            max = scale.max,
            majorTM = scale.majorTM,
            axisPosition = scale.axisPosition,
            minorTMHeight = scale.minorTMHeight,
            majorTMHeight = scale.majorTMHeight,
            connectorColor = scale.connectorColor,
            connectorThickness = scale.connectorThickness,
            minorTMColor = scale.minorTMColor,
            minorTMThickness = scale.minorTMThickness,
            majorTMColor = scale.majorTMColor,
            majorTMThickness = scale.majorTMThickness,
            tickMarkDistance = scale.tickMarkDistance,
            tickValueDistance = scale.tickValueDistance,
            placeTicksInside = scale.placeTicksInside,
            placeValuesInside = scale.placeValuesInside,
            tickMaxHeight = Math.max(majorTMHeight, minorTMHeight),
            scaleGroup = elements.scaleGroup || (elements.scaleGroup = paper.group('scale', wGroup)),
            labelHAlign = POSITION_CENTER,
            labelVAlign = POSITION_MIDDLE,
            reverseScale = scale.reverseScale,
            startValue = min,
            minorTMThicknessHalf = minorTMThickness / 2,
            majorTMThicknessHalf = majorTMThickness / 2,
            valueRange = max - min,
            sx = 0,
            sy = 0,
            k1 = 0,
            k2 = 0,
            Mk1 = 0,
            Mk2 = 0,
            mk1 = 0,
            mk2 = 0,
            k3 = 0,
            k4 = 0,
            k5 = 0,
            k6 = 0,
            k7 = 0,
            k8 = 0,
            transX = 0,
            transY = 0,
            tx, ty, ltx,
            style,
            majorTMObj,
            value,
            label,
            index,
            length;

            if (placeTicksInside) {
                tickMarkDistance = -tickMarkDistance;
                majorTMHeight = -majorTMHeight;
                minorTMHeight = -minorTMHeight;
                if (placeValuesInside) {
                    tickMaxHeight = -tickMaxHeight;
                    tickValueDistance = -tickValueDistance;
                }
                else {
                    tickMaxHeight = -tickMarkDistance;
                }
            }
            else {
                if (placeValuesInside) {
                    tickMaxHeight = -tickMarkDistance;
                    tickValueDistance = -tickValueDistance;
                }
            }

            if (reverseScale) {
                valueRange = -valueRange;
                startValue = max;
            }

            switch (axisPosition) {
                case 1 : // TOP
                    sx = width / valueRange;
                    k2 = -tickMarkDistance;
                    Mk2 = k2 - majorTMThicknessHalf;
                    mk2 = k2 - minorTMThicknessHalf;
                    k4 = k2 - majorTMHeight;
                    k6 = k2 - minorTMHeight;
                    k8 = k2 - tickMaxHeight - tickValueDistance;
                    labelHAlign = POSITION_CENTER;
                    labelVAlign = placeValuesInside ? POSITION_TOP : POSITION_BOTTOM;
                    break;
                case 2 : // RIGHT
                    sy = height / valueRange;
                    k1 = tickMarkDistance;
                    Mk1 = k1 + majorTMThicknessHalf;
                    mk1 = k1 + minorTMThicknessHalf;
                    k3 = k1 + majorTMHeight;
                    k5 = k1 + minorTMHeight;
                    k7 = k1 + tickMaxHeight + tickValueDistance;
                    transX = width;
                    labelHAlign = placeValuesInside ? POSITION_RIGHT : POSITION_LEFT;
                    labelVAlign = POSITION_MIDDLE;
                    break;
                case 3 : // BOTTOM

                    sx = width / valueRange;
                    k2 = tickMarkDistance;
                    Mk2 = k2 + majorTMThicknessHalf;
                    mk2 = k2 + minorTMThicknessHalf;
                    k4 = k2 + majorTMHeight;
                    k6 = k2 + minorTMHeight;
                    k8 = k2 + tickMaxHeight + tickValueDistance;
                    transY = height;
                    labelHAlign = POSITION_CENTER;
                    labelVAlign = placeValuesInside ? POSITION_BOTTOM : POSITION_TOP;
                    break;
                case 4 : // LEFT
                    sy = height / valueRange;
                    k1 = -tickMarkDistance;
                    Mk1 = k1 - majorTMThicknessHalf;
                    mk1 = k1 - minorTMThicknessHalf;
                    k3 = k1 - majorTMHeight;
                    k5 = k1 - minorTMHeight;
                    k7 = k1 - tickMaxHeight - tickValueDistance;
                    labelHAlign = placeValuesInside ? POSITION_LEFT : POSITION_RIGHT;
                    labelVAlign = POSITION_MIDDLE;
                    break;
            }

            // Blank array to store Ticks
            if (!elements.minorTM) {
                elements.minorTM = [];
            }
            if (!elements.majorTM) {
                elements.majorTM = [];
            }
            if (!renderer.tmLabel) {
                elements.tmLabel = [];
            }

            // Draw minor ticks
            if (minorTMHeight) {
                for (index = 0, length = minorTM.length; index < length; index += 1) {
                    value = minorTM[index] - startValue;
                    tx = value * sx;
                    ty = value * sy;
                    //path = paper.crispLine([M, tx + mk1, ty + mk2, L,
                    //    tx + k5, ty + k6], minorTMThickness);
                    elements.minorTM[index] = paper.path([M, tx + mk1, ty + mk2, L,
                        tx + k5, ty + k6], scaleGroup)
                    .attr({
                        'shape-rendering': DECIDE_CRISPENING[(minorTMThickness < 1)],
                        stroke: minorTMColor,
                        'stroke-linecap': 'round',
                        'stroke-width': minorTMThickness
                    });
                }
            }


            // Draw major ticks and ticks labels
            for (index = 0, length = majorTM.length; index < length; index += 1) {
                majorTMObj = majorTM[index];
                value = majorTMObj.value - startValue;
                label = majorTMObj.displayValue;
                tx = value * sx;
                ty = value * sy;
                // Draw major ticks
                if (minorTMHeight) {
                    //path = renderer.crispLine([M, tx + Mk1, ty + Mk2, L,
                    //    tx + k3, ty + k4], minorTMThickness);
                    elements.majorTM[index] = paper.path([M, tx + Mk1, ty + Mk2, L,
                        tx + k3, ty + k4], scaleGroup)
                    .attr({
                        'shape-rendering': DECIDE_CRISPENING[(majorTMThickness < 1)],
                        stroke: majorTMColor,
                        'stroke-linecap': 'round',
                        'stroke-width': majorTMThickness
                    });
                }

                if (label !== BLANKSTRING) {
                    style = (index === 0 || index === length - 1) ? scale.limitValues.style :
                        scale.tickValues.style;
                    ltx = majorTMObj.labelX || 0;
                    // Render tickMark label text

                    elements.tmLabel[index] = paper.text(tx + k7 + ltx, (ty + k8), label, scaleGroup)
                    .attr({
                        'text-anchor': textHAlign[majorTMObj.align || labelHAlign],
                        'vertical-align': labelVAlign, /** @todo get from dataLabels.align */
                        title: (majorTMObj.originalText || '')
                    })
                    .css(style);
                }
            }

            // Draw Straight line
            if (connectorThickness) {
                //path = renderer.crispLine([M, k1, k2, L, valueRange * sx + k1,
                //    valueRange * sy + k2], majorTMThickness);
                elements.tmConnector = paper.path([M, k1, k2, L, valueRange * sx + k1,
                    valueRange * sy + k2], scaleGroup)
                .attr({
                    'shape-rendering': DECIDE_CRISPENING[(connectorThickness < 1)],
                    stroke: connectorColor,
                    'stroke-linecap': 'round',
                    'stroke-width': connectorThickness
                });
            }

            //translate the group to properly position it
            scaleGroup.translate(transX, transY);

            return scaleGroup;
        },

        realtimeUpdate: function (updateObj) {

            if (updateObj === this.lastUpdatedObj) {
                return false;
            }

            var renderer = this,
            options = renderer.options,
            series = options.series,
            logic = renderer.logic,
            dataArr = (series && series[0] && series[0].data),
            values = updateObj.values || [],
            labels = updateObj.labels || [],
            toolTexts = updateObj.toolTexts || [],
            showLabels = updateObj.showLabels || [],
            i = (dataArr && dataArr.length) || 0,
            newData = [],
            pointObj;

            if (i) {
                while (i--) {
                    pointObj = {};
                    if (values[i] !== undefined && values[i] !== '') {
                        pointObj.value = values[i];
                        //pointObj.displayvalue = pointObj.tooltext = numberFormatter.dataLabels(pointObj.value);
                        pointObj.hasNewData = true;
                    }
                    else {
                        pointObj.value = dataArr[i].y;
                    }

                    if (labels[i]) {
                        pointObj.displayvalue = labels[i];
                        pointObj.hasNewData = true;
                    }

                    if (toolTexts[i]) {
                        pointObj.tooltext = toolTexts[i];
                        pointObj.hasNewData = true;
                    }

                    pointObj.hasNewData &&
                        (newData[i] = logic.getPointStub(pointObj, i, options, renderer.definition));

                    if (showLabels[i] == '0' || !dataArr[i].displayValue) {
                        newData[i].displayValue = BLANKSTRING;
                    }

                }

                newData.length && (this.lastUpdatedObj = updateObj) && this.drawValue(newData);

                return Boolean(newData.length);
            }
        }

    }, renderer['renderer.root']);

    renderer('renderer.bulb', {

        drawWidget: function () {
            var renderer = this,
                options = renderer.options,
                chartOptions = options.chart,
                paper = renderer.paper,
                elements = renderer.elements,
                gaugeRadius = chartOptions.gaugeRadius,
                gaugeOriginX = chartOptions.gaugeOriginX,
                gaugeOriginY = chartOptions.gaugeOriginY,
                bulbProperties = (options.series[0] && options.series[0].data &&
                    options.series[0].data[0] || {}),
                rolloverProperties = bulbProperties.rolloverProperties || {},
                bulbAttr = {
                    cx: gaugeOriginX,
                    cy: gaugeOriginY,
                    stroke: bulbProperties.borderColor,
                    'stroke-linecap': 'round',
                    'stroke-width': bulbProperties.borderWidth,
                    r: chartOptions.animation ? 0.001 : gaugeRadius
                },
                bulbAnimateAttr = {
                    r: gaugeRadius
                },
                bulb;

            if (bulbProperties.y !== null && !isNaN(bulbProperties.y)) {
                bulb = elements.bulb = ((bulb = elements.bulb) ?
                    bulb.attr(bulbAttr) : (paper.circle(bulbAttr, renderer.layers.dataset)));

                if (chartOptions.animation) {
                    bulb.animate(bulbAnimateAttr, chartOptions.animation.duration, 'easeIn');
                }

                // if there are hover effect then add hover effect
                if (rolloverProperties.enabled) {
                    bulb.mouseover(function() {
                        bulb.attr(rolloverProperties.hoverAttr);
                        if (rolloverProperties.hoverAnimAttr) {
                            bulb.animate(rolloverProperties.hoverAnimAttr, 100, 'easeIn');
                        }
                    })
                    .data('hoverAttr', rolloverProperties.hoverAttr)
                    .mouseout(function() {
                        bulb.attr(rolloverProperties.outAttr);
                        if (rolloverProperties.hoverAnimAttr) {
                            bulb.animate(bulbAnimateAttr, 100, 'easeIn');
                        }
                        else {
                            bulb.attr(bulbAnimateAttr);
                        }
                    }).data('outAttr', rolloverProperties.outAttr);
                }
            }
        },

        drawWidgetValue: function (dataArr) {
            var renderer = this,
                elements = renderer.elements,
                bulbProperties = dataArr[0],
                rolloverProperties = bulbProperties.rolloverProperties || {},
                hoverAttr = rolloverProperties.hoverAttr,
                outAttr = rolloverProperties.outAttr,
                bulbAttr = {
                    fill: toRaphaelColor(bulbProperties.color),
                    ishot: true
                },
                bulb = elements.bulb,
                hoverAttrData = bulb.data('hoverAttr'),
                outAttrData = bulb.data('outAttr'),
                eventArgs;

            if (rolloverProperties.enabled) {
                if (hoverAttr && hoverAttr.stroke) {
                    hoverAttrData.stroke = hoverAttr.stroke;
                    outAttrData.stroke = outAttr.stroke;
                }
                if (hoverAttr && hoverAttr.fill) {
                    hoverAttrData.fill = hoverAttr.fill;
                    outAttrData.fill = outAttr.fill;
                }
            }

            if (!bulb) {
                renderer.drawWidget();
            }

            eventArgs = {
                value: bulbProperties.y,
                displayValue: bulbProperties.displayValue,
                toolText: bulbProperties.toolText
            };

            if (bulbProperties.y !== null && !isNaN(bulbProperties.y)) {
                bulb.attr(bulbAttr)
                .click(function (data) {
                    var ele = this;

                    plotEventHandler.call(ele, renderer, data);
                })
                .hover(function (data) {
                    var ele = this;
                    plotEventHandler.call(ele, renderer, data, ROLLOVER);
                }, function (data) {
                    var ele = this;
                    plotEventHandler.call(ele, renderer, data, ROLLOUT);
                })
                .tooltip(bulbProperties.toolText)
                .data('eventArgs', eventArgs);
            }
        },

        drawScale: function () {
            // Not applicable for bulb.
        },

        drawWidgetLabel: function (dataArr) {
            var renderer = this,
            options = renderer.options,
            chartOptions = options.chart,
            paper = renderer.paper,
            elements = renderer.elements,
            layers = renderer.layers,
            gaugeRadius = chartOptions.gaugeRadius,
            gaugeOriginX = chartOptions.gaugeOriginX,
            gaugeOriginY = chartOptions.gaugeOriginY,
            bulbProperties = dataArr[0],
            labelGroup = layers.datalabels,
            labelElement = elements.dataLabel,
            style = chartOptions.dataLabels.style,
            css = {
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                lineHeight: style.lineHeight,
                fontWeight: style.fontWeight,
                fontStyle: style.fontStyle
            },
            labelY,
            vAlign;

            // create a separate group for the data labels to avoid rotation
            if (!labelGroup) {
                labelGroup = layers.datalabels = paper.group('datalabels').insertAfter(layers.dataset);
            }

            if (!chartOptions.placeValuesInside) {
                labelY = gaugeOriginY + gaugeRadius + chartOptions.valuePadding;
                vAlign = POSITION_TOP;
            } else {
                labelY = gaugeOriginY;
                vAlign = POSITION_MIDDLE;
            }

            // only draw the point if y is defined
            if (bulbProperties.y !== null && !isNaN(bulbProperties.y) &&
                (bulbProperties.displayValue !== BLANKSTRING)) {

                if (!labelElement) {
                    elements.dataLabel = labelElement = paper.text(renderer.layers.dataset);
                }

                labelElement.attr({
                    text: bulbProperties.displayValue,
                    'text-anchor': 'middle',
                    x: gaugeOriginX,
                    y: labelY,
                    title: (bulbProperties.originalText || ''),
                    'vertical-align': vAlign,
                    fill: style.color,
                    'text-bound': [style.backgroundColor, style.borderColor,
                        style.borderThickness, style.borderPadding,
                        style.borderRadius, style.borderDash]
                })
                .css(css);
            }

        }

    }, renderer['renderer.widgetbase']);

    renderer('renderer.thermometer', {

        drawWidget: function () {
            var renderer = this,
                options = renderer.options,
                chartOptions = options.chart,
                paper = renderer.paper,
                thmProperties = options.series[0].data[0],
                plotHoverEffects = chartOptions.plotHoverEffects || {},
                cos50 = 0.643,
                thmBulbRadius = chartOptions.thmBulbRadius,
                halfThmWidth = thmBulbRadius * cos50,

                colorObj = new Color(thmProperties.color),
                color = colorObj.get('hex').replace(dropHash, BLANKSTRING),
                alpha = colorObj.get('a') * 100,
                thermometer;

            thmProperties.minValue = options.scale.min;
            thmProperties.maxValue = options.scale.max;

            thermometer = renderer.elements.thermometer = drawThermometer(
                0 + halfThmWidth,
                0 - halfThmWidth,
                thmBulbRadius,
                chartOptions.thmHeight,
                renderer.layers.dataset,
                paper,
                0,
                chartOptions.thmGlassColor,
                chartOptions.gaugeBorderColor,
                chartOptions.gaugeBorderThickness,
                color,
                alpha,
                chartOptions.use3DLighting
            );

            // if there has hover effect then add hover effect
            if (plotHoverEffects.enabled) {
                thermometer.data('hoverInAttrs', {
                    fluidColor: plotHoverEffects.thmFillHoverColor,
                    fluidAlpha: plotHoverEffects.thmFillHoverAlpha
                }).data('hoverOutAttrs', {
                    fluidColor: color,
                    fluidAlpha: alpha
                }).hover(function() {
                    thermometer.attr(thermometer.data('hoverInAttrs'));
                }, function() {
                    thermometer.attr(thermometer.data('hoverOutAttrs'));
                });
            }
        },

        drawWidgetValue: function (dataArr, animation) {
            var renderer = this,
                options = renderer.options,
                elements = renderer.elements,
                scale = options.scale,
                maxValue = scale.max,
                minValue = scale.min,

                thmProperties = dataArr[0],
                pointValue = pluckNumber(thmProperties.y, minValue),
                fluidHRatio = (pointValue - minValue) / (maxValue - minValue),
                eventArgs,
                elm;

            if (!elements.thermometer) {
                renderer.drawWidget();
            }

            thmProperties.fluidHRatio = fluidHRatio;

            eventArgs = {
                value: thmProperties.y,
                displayValue: thmProperties.displayValue,
                toolText: thmProperties.toolText
            };

            animation && elements.thermometer._setAnimate(animation);

            elements.thermometer.attr({
                fluidHRatio: fluidHRatio,
                ishot: true
            })
            .click(function (data) {
                var ele = this;
                plotEventHandler.call(ele, renderer, data);
            })
            .hover(function (data) {
                var ele = this;
                plotEventHandler.call(ele, renderer, data, ROLLOVER);
            }, function (data) {
                var ele = this;
                plotEventHandler.call(ele, renderer, data, ROLLOUT);
            })
            .data('eventArgs', eventArgs);

            // Iterate on elements of a group and set tooltext
            if (thmProperties.toolText && (elm = elements.thermometer.bottom)) {
                do {
                    elm.tooltip(thmProperties.toolText);
                } while ((elm = elm.next));
            }

        }

    }, renderer['renderer.widgetbase']);

    renderer('renderer.cylinder', {

        drawWidget: function () {

            var renderer = this,
                options = renderer.options,
                chartOptions = options.chart,
                plotHoverEffects = chartOptions.plotHoverEffects || {},
                paper = renderer.paper,
                elements = renderer.elements,
                layers = renderer.layers,
                wGroup = layers.dataset,
                scale = options.scale,
                maxValue = scale.max,
                minValue = scale.min,
                cylProperties = options.series[0].data[0],
                hoverAttr,
                outAttr;

            cylProperties.minValue = minValue;
            cylProperties.maxValue = maxValue;

            elements.cylinder = drawCylinder(
                chartOptions.cylRadius,
                0,
                chartOptions.cylRadius,
                chartOptions.cylHeight,
                chartOptions.cylYScale,
                wGroup,
                paper,
                0,
                chartOptions.cylGlassColor,
                '100',
                chartOptions.cylFillColor,
                chartOptions.cylFillAlpha
            );

            //if there has hover effect then add hover effect
            if (plotHoverEffects.enabled) {
                hoverAttr = {
                    color: plotHoverEffects.cylFillHoverColor,
                    alpha: plotHoverEffects.cylFillHoverAlpha
                };
                outAttr = {
                    color: chartOptions.cylFillColor,
                    alpha: chartOptions.cylFillAlpha
                };
                elements.cylinder.hover(function () {
                    elements.cylinder.attr(hoverAttr);
                }, function () {
                    elements.cylinder.attr(outAttr);
                });
            }

        },

        drawWidgetValue: function (dataArr, animation) {
            var renderer = this,
                options = renderer.options,
                elements = renderer.elements,
                scale = options.scale,
                maxValue = scale.max,
                minValue = scale.min,
                cylProperties = dataArr[0],
                pointValue = pluckNumber(cylProperties.y, minValue),
                fluidHRatio = (pointValue - minValue) / (maxValue - minValue),
                eventArgs,
                elm;

            if (!elements.cylinder) {
                renderer.drawWidget();
            }

            eventArgs = {
                value: cylProperties.y,
                displayValue: cylProperties.displayValue,
                toolText: cylProperties.toolText
            };

            cylProperties.fluidHRatio = fluidHRatio;

            animation && elements.cylinder._setAnimate(animation);
            elements.cylinder.attr({
                fluidHRatio: fluidHRatio,
                ishot: true
            })
            .click(function (data) {
                var ele = this;
                plotEventHandler.call(ele, renderer, data);
            })
            .hover(function (data) {
                var ele = this;
                plotEventHandler.call(ele, renderer, data, ROLLOVER);
            }, function (data) {
                var ele = this;
                plotEventHandler.call(ele, renderer, data, ROLLOUT);
            })
            .data('eventArgs', eventArgs);

            // Iterate on elements of a group and set tooltext
            if (cylProperties.toolText && (elm = elements.cylinder.bottom)) {
                do {
                    elm.tooltip(cylProperties.toolText);
                } while ((elm = elm.next));
            }
        }

    }, renderer['renderer.widgetbase']);

    renderer('renderer.led', {

        drawWidget: function () {
            var renderer = this,
            options = renderer.options,
            paper = renderer.paper,
            logic = renderer.logic,
            chartOptions = options.chart,
            elements = renderer.elements,
            scale = options.scale,
            maxValue = scale.max,
            minValue = scale.min,
            ledData = options.series[0].data[0],
            layers = renderer.layers,
            wGroup = layers.dataset,
            LEDType;

            ledData.minValue = minValue;
            ledData.maxValue = maxValue;

            if (logic.isHorizontal) {
                LEDType = scale.reverseScale ? 3 : 1;
            }
            else {
                LEDType = scale.reverseScale ? 4 : 2;
            }

            //draw the LED first
            elements.led = drawLED(
                0,
                0,
                renderer.canvasWidth,
                renderer.canvasHeight,
                wGroup,
                paper,
                0,
                chartOptions.gaugeFillColor,
                chartOptions.gaugeBorderColor,
                chartOptions.gaugeBorderAlpha,
                chartOptions.gaugeBorderThickness,
                logic.colorRangeGetter,
                minValue,
                maxValue,
                chartOptions.useSameFillColor,
                chartOptions.useSameFillBgColor,
                chartOptions.ledSize,
                chartOptions.ledGap,
                LEDType,
                chartOptions.showShadow,
                chartOptions.plotHoverEffect
            );

        },

        drawWidgetValue: function (dataArr, animation) {
            var renderer = this,
            elements = renderer.elements,
            ledData = dataArr[0],
            pointValue = ledData.y;

            if (!elements.led) {
                renderer.drawWidget();
            }

            animation && elements.led._setAnimate(animation);
            elements.led.attr({value: pointValue});
        }

    }, renderer['renderer.widgetbase']);

    renderer('renderer.bullet', {

        drawWidget: function () {
            var renderer = this,
            options = renderer.options,
            paper = renderer.paper,
            logic = renderer.logic,
            chartOptions = options.chart,
            scale = options.scale,
            elements = renderer.elements,
            layers = renderer.layers,
            wGroup = layers.dataset,
            width = renderer.canvasWidth,
            height = renderer.canvasHeight,
            min = scale.min,
            max = scale.max,
            trendArray = (scale && scale.trendPoint) || [],
            gaugeFillMix = chartOptions.colorRangeFillMix,
            gaugeFillRatio = chartOptions.colorRangeFillRatio,
            gaugeBorderColor = chartOptions.colorRangeBorderColor,
            gaugeBorderAlpha = chartOptions.colorRangeBorderAlpha,
            gaugeBorderThickness = chartOptions.colorRangeBorderThickness,
            colorArray = logic.colorRangeGetter.getColorRangeArr(min, max),
            showShadow = chartOptions.showShadow,
            shadow,
            gaugeType,
            i,
            len,
            trendObj,
            colorGrp,
            getRectXY,
            angle,
            color,
            colorObj,
            borderColor,
            xyObj,
            // Color Manager for widgets
            colorM = logic.colorManager,
            crColor,
            crAlpha,
            shadowAlpha,
            borderAlpha;

            if (!elements.linear) {
                elements.linear = colorGrp = paper.group('colorrange', wGroup);
                //draw the outer rectangle
                elements.outerRect = paper.rect(colorGrp);
            }

            elements.outerRect.attr({
                x: 0,
                y: 0,
                width: width,
                height: height,
                stroke: 'none',
                r: 0
            });

            if (logic.isHorizontal) {//left to right
                gaugeType = scale.reverseScale ? 3 : 1;
            }
            else {//top to bottom
                gaugeType = scale.reverseScale ? 4 : 2;
            }


            if (gaugeType === 1 ) { // horizontal gauge; left to right;
                getRectXY = function (minValue, maxValue) {
                    return {
                        x: ((minValue * width / (max - min))),
                        y: 0,
                        width: (maxValue - minValue) * width / (max - min),
                        height: height
                    };
                };
                angle = 270;

            } else if (gaugeType === 2) { // vertical gauge; top to bottom;
                getRectXY = function (minValue, maxValue) {
                    return {
                        x: 0,
                        y: (minValue * height / (max - min)),
                        width: width,
                        height: (maxValue - minValue) * height / (max - min)
                    };
                };
                angle = 180;

            } else if (gaugeType === 3) { // horizontal linear gauge; right to left;
                getRectXY = function (minValue, maxValue) {
                    return {
                        x: width - (maxValue * width / (max - min)),
                        y: 0,
                        width: (maxValue - minValue) * width / (max - min),
                        height: height
                    };
                };
                angle = 270;

            } else {  // vertical linear gauge; bottom to top;
                getRectXY = function (minValue, maxValue) {
                    return {
                        x: 0,
                        y: height - (maxValue * height / (max - min)),
                        width: width,
                        height: (maxValue - minValue) * height / (max - min)
                    };
                };
                angle = 180;
            }

            if (!elements.colorRangeElems) {
                elements.colorRangeElems = [];
            }

            for (i = 0, len = colorArray.length; i < len; i += 1) {
                colorObj = colorArray[i],
                xyObj = getRectXY((colorObj.minvalue - min), (colorObj.maxvalue - min));
                colorObj.x = xyObj.x;
                colorObj.y = xyObj.y;
                colorObj.width = xyObj.width;
                colorObj.height = xyObj.height;

                color = colorObj.code;
                borderColor = convertColor(getColorCodeString(color, gaugeBorderColor), gaugeBorderAlpha);

                shadow = showShadow ? (Math.max(colorObj.alpha, gaugeBorderAlpha) / 100) : null;

                //create the shadow element
                crColor = colorM.parseColorMix(colorObj.code, gaugeFillMix);
                crAlpha = colorM.parseAlphaList(colorObj.alpha, crColor.length);
                borderAlpha = pluckNumber(colorObj.borderAlpha, gaugeBorderAlpha);
                shadowAlpha = crAlpha.split(COMMASTRING);

                shadowAlpha = mathMax.apply(Math, shadowAlpha);
                shadowAlpha = mathMax(gaugeBorderThickness && borderAlpha || 0, shadowAlpha);

                if (!elements.colorRangeElems[i]) {
                    elements.colorRangeElems[i] = paper.rect(colorGrp);
                }

                elements.colorRangeElems[i].attr({
                    x: xyObj.x,
                    y: xyObj.y,
                    width: xyObj.width,
                    height: xyObj.height,
                    r: 0,
                    'stroke-width': gaugeBorderThickness,
                    stroke: borderColor,
                    'fill': toRaphaelColor({
                        FCcolor: {
                            color: crColor.toString(),
                            ratio: gaugeFillRatio,
                            alpha: crAlpha,
                            angle: angle
                        }
                    })
                })
                .shadow({
                    apply: showShadow,
                    opacity: (shadowAlpha / 100)
                });
            }

            while (elements.colorRangeElems[i]) {
                elements.colorRangeElems[i].remove();
                elements.colorRangeElems.splice(i, 1);
            }

            if (!elements.trendObjElems) {
                elements.trendObjElems = [];
            }

            for (i = 0, len = trendArray.length; i < len; i += 1) {
                trendObj = trendArray[i],

                xyObj = getRectXY((trendObj.startValue - min), (trendObj.endValue - min));

                if (trendObj.isZone) {
                    if (!elements.trendObjElems[i]) {
                        elements.trendObjElems[i] = paper.rect(colorGrp);
                    }
                    elements.trendObjElems[i].attr({
                        x: xyObj.x,
                        y: xyObj.y,
                        width: xyObj.width > 0 ? xyObj.width : 0,
                        height: xyObj.height > 0 ? xyObj.height : 0,
                        r: 0,
                        fill: toRaphaelColor({
                            FCcolor: {
                                color: trendObj.color,
                                alpha: trendObj.alpha
                            }
                        })
                    });
                }
                else {

                    elements.trendObjElems[i] = renderer.path([M, xyObj.x, xyObj.y, L, xyObj.x,
                        (xyObj.y + xyObj.height)], colorGrp)
                    .attr({
                        stroke: convertColor(trendObj.color, trendObj.alpha),
                        'stroke-width': trendObj.thickness,
                        'stroke-dasharray': trendObj.dashStyle
                    });
                }
            }

            while (elements.trendObjElems[i]) {
                elements.trendObjElems[i].remove();
                elements.trendObjElems.splice(i, 1);
            }
        },

        drawWidgetValue: function (data) {
            var renderer = this,
            paper = renderer.paper,
            options = renderer.options,
            chartAPI = renderer.logic,
            wGroup = renderer.layers.dataset,
            width = renderer.canvasWidth,
            height = renderer.canvasHeight,
            scale = options.scale,
            maxValue = scale.max,
            minValue = scale.min,
            valueRange = maxValue - minValue,
            dataPoint = data[0],
            target = data[1],
            trendArray = (scale && scale.trendPoint) || [],
            startX, startY, endY, endX, plotHeight, plotWidth, targetWidth,
            targetHeight, targetBorderWidth = target.borderWidth, tooltipCorrection = 10,
            isHorizontal = chartAPI.isHorizontal,
            trackerX,
            trackerY,
            targetLength,
            tooltipPos,
            halfTargetLength,
            i = data.length,
            sx = 0,
            sy = 0,
            kx = 0,
            ky = 0,
            startValue = minValue,
            startValuePlot,
            hoveAnimObj,
            outAnimObj,
            animEffect = 'easeOut',
            value,
            point,
            gaugeType,
            eventArgs,
            rolloverProperties,
            startPointPosition,
            targetRolloverProperties,
            targetOutAnimObj,
            targetHoveAnimObj,
            valueTranslator = function(value) {
                value = pluckNumber(value, startValue) - startValue;
                return {
                    x: (value * sx + kx),
                    y: (value * sy + ky)
                };
            };

            if (isHorizontal) {//left to right
                sx = width / valueRange;
                ky = height / 2;
                gaugeType = scale.reverseScale ? 3 : 1;
            }
            else {//top to bottom
                sy = height / valueRange;
                kx = width / 2;
                gaugeType = scale.reverseScale ? 4 : 2;
            }

            if (scale.reverseScale) {
                sx = -sx;
                sy = -sy;
                startValue = maxValue;
            }

            //add this gaugeType in Series Obj
            //renderer.gaugeType = gaugeType;

            // do the translation
            while (i--) {
                point = data[i];
                value = pluckNumber(point.y, startValue) - startValue;
                point.plotX = point.origX = value * sx + kx;
                point.plotY = point.origY = value * sy + ky;
            }

            i = trendArray.length;

            while (i--) {
                point = trendArray[i];
                value = point.startValue - minValue;
                point.plotX = point.origX = value * sx + kx;
                point.plotY = point.origY = value * sy + ky;
            }

            startValuePlot = Math.min(Math.max(minValue, 0), maxValue);
            startPointPosition = valueTranslator(startValuePlot);

            if (defined(dataPoint.y)) {
                if (dataPoint.plotAsDot) {
                    // The bullet has to be centrally aligned.
                    /** @todo if we do not follow Flash in that case */
                    //then the code should be following for better vies
                    //plotHeight = plotWidth = Math.min(gaugeHeight, gaugeWidth) * (point.plotFillPercent / 100);
                    plotHeight = plotWidth = (isHorizontal ? height : width) * (dataPoint.plotFillPercent / 100);
                    startX = dataPoint.plotX - (plotWidth / 2);
                    startY = dataPoint.plotY - (plotHeight / 2);
                    if (isHorizontal) {
                        dataPoint.animInitAttr = {
                            x : startPointPosition.x
                        };
                        dataPoint.animAttr = {
                            x : startX
                        };
                    }
                    else {
                        dataPoint.animInitAttr = {
                            y : startPointPosition.y
                        };
                        dataPoint.animAttr = {
                            y : startY
                        };
                    }
                } else {

                    startX = Math.min(dataPoint.plotX, startPointPosition.x);
                    startY = Math.min(dataPoint.plotY, startPointPosition.y);
                    plotHeight = Math.abs(dataPoint.plotY - startPointPosition.y);
                    plotWidth = Math.abs(dataPoint.plotX - startPointPosition.x);

                    if (isHorizontal) {
                        dataPoint.animInitAttr = {
                            x : startPointPosition.x,
                            width : 0
                        };
                        dataPoint.animAttr = {
                            x : startX,
                            width : plotWidth
                        };
                        plotHeight = height * (dataPoint.plotFillPercent / 100);
                        startY -= plotHeight / 2;
                    }
                    else {
                        dataPoint.animInitAttr = {
                            y : startPointPosition.y,
                            height : 0
                        };
                        dataPoint.animAttr = {
                            y : startY,
                            height : plotHeight
                        };
                        plotWidth = width * (dataPoint.plotFillPercent / 100);
                        startX -= plotWidth / 2;
                    }
                }

                eventArgs = {
                    link: point.link,
                    value: dataPoint.y,
                    displayValue: dataPoint.displayValue,
                    toolText: point.toolText
                };

                point.shapeType = 'rect';
                point.shapeArgs = {
                    x: startX,
                    y: startY,
                    height: plotHeight,
                    width: plotWidth,
                    endY: endY,
                    r: 0
                };
                rolloverProperties = dataPoint.rolloverProperties || {};
                if (rolloverProperties.enabled && rolloverProperties.plotFillHoverPercent !== undefined) {
                    //if required animation then add in seperate obj
                    if (rolloverProperties.showHoverAnimation) {
                        hoveAnimObj = {};
                        outAnimObj = {};
                    }
                    else {
                        hoveAnimObj = rolloverProperties.hoverAttr;
                        outAnimObj = rolloverProperties.outAttr;
                    }
                    if (dataPoint.plotAsDot) {
                        hoveAnimObj.width = hoveAnimObj.height = (isHorizontal ? height : width) *
                            (rolloverProperties.plotFillHoverPercent / 100);
                        hoveAnimObj.x = dataPoint.plotX - (hoveAnimObj.width / 2);
                        hoveAnimObj.y = dataPoint.plotY - (hoveAnimObj.width / 2);
                        outAnimObj.width = outAnimObj.height = plotWidth;
                        outAnimObj.x = startX;
                        outAnimObj.y = startY;
                    }
                    else {
                        if (isHorizontal) {
                            hoveAnimObj.height = height * (rolloverProperties.plotFillHoverPercent / 100);
                            hoveAnimObj.y = Math.min(dataPoint.plotY, startPointPosition.y) - (hoveAnimObj.height / 2);
                            outAnimObj.height = plotHeight;
                            outAnimObj.y = startY;
                        }
                        else {
                            hoveAnimObj.width = width * (rolloverProperties.plotFillHoverPercent / 100);
                            hoveAnimObj.x = Math.min(dataPoint.plotX, startPointPosition.x) - (hoveAnimObj.width / 2);
                            outAnimObj.width = plotWidth;
                            outAnimObj.x = startX;
                        }
                    }

                }

                point.graphic = paper.rect(startX, startY, plotWidth, plotHeight, 0, wGroup)
                .attr({
                    'fill' : point.color,
                    'stroke' : point.borderColor,
                    ishot: true,
                    'stroke-width': point.borderWidth
                })
                .click(function (data) {
                    var ele = this;
                    plotEventHandler.call(ele, renderer, data);
                })
                .hover(function (data) {
                    var ele = this;
                    plotEventHandler.call(ele, renderer, data, ROLLOVER);
                    if (rolloverProperties.enabled) {
                        ele.attr(rolloverProperties.hoverAttr);
                        if (rolloverProperties.showHoverAnimation) {
                            ele.animate(hoveAnimObj, 100, animEffect);
                        }
                    }
                }, function (data) {
                    var ele = this;
                    plotEventHandler.call(ele, renderer, data, ROLLOUT);
                    if (rolloverProperties.enabled) {
                        ele.attr(rolloverProperties.outAttr);
                        if (rolloverProperties.showHoverAnimation) {
                            ele.animate(outAnimObj, 100, animEffect);
                        }
                    }
                })
                .tooltip(point.toolText)
                .data('eventArgs', eventArgs);
            }

            //draw the target
            if (defined(target.y)) {
                if (isHorizontal) {
                    targetLength = height * target.targetFillPercent / 100,
                    halfTargetLength = targetLength / 2;
                    endX = startX = target.plotX;
                    trackerY = startY = target.plotY - halfTargetLength;
                    endY = target.plotY + halfTargetLength;
                    targetHeight = targetLength;
                    targetWidth = targetBorderWidth;
                    trackerX = startX - (targetBorderWidth / 2);
                    tooltipPos = [startX + targetBorderWidth , target.plotY];
                }
                else {
                    targetLength = width * target.targetFillPercent / 100,
                    halfTargetLength = targetLength / 2;
                    trackerX = startX = target.plotX - halfTargetLength;
                    startY = endY = target.plotY;
                    endX = target.plotX + halfTargetLength;
                    targetHeight = targetBorderWidth;
                    targetWidth = targetLength;
                    trackerY = startY - (targetBorderWidth / 2);
                    tooltipPos = [target.plotX, startY + targetBorderWidth + tooltipCorrection];

                }


                target.shapeType = 'rect';//used in tracker
                target.tooltipPos = tooltipPos;

                target.trackerArgs = {
                    x: trackerX,
                    y: trackerY,
                    height: targetHeight,
                    width: targetWidth,
                    r: 0
                };

                target.shapeArgs = [M, startX, startY, L, endX, endY];

                target.animInitAttr = {
                    d : [M, target.plotX, target.plotY, L, target.plotX, target.plotY]
                };
                target.animAttr = {
                    d : target.shapeArgs
                };

                eventArgs = {
                    link: target.link,
                    value: target.y,
                    displayValue: target.displayValue,
                    toolText: target.toolText
                };

                targetRolloverProperties = target.rolloverProperties || {};
                if (targetRolloverProperties.enabled && targetRolloverProperties.plotFillHoverPercent !== undefined) {
                    //if required animation then add in seperate obj
                    if (targetRolloverProperties.showHoverAnimation) {
                        targetHoveAnimObj = {};
                        targetOutAnimObj = {d: target.shapeArgs};
                    }
                    else {
                        targetHoveAnimObj = targetRolloverProperties.hoverAttr;
                        targetRolloverProperties.outAttr.d = target.shapeArgs;
                    }
                    if (isHorizontal) {
                        targetLength = height * target.plotFillHoverPercent / 100,
                        halfTargetLength = targetLength / 2;
                        targetHoveAnimObj.d = [M, startX, target.plotY - halfTargetLength, L,
                            endX, target.plotY + halfTargetLength];
                    }
                    else {
                        targetLength = width * target.plotFillHoverPercent / 100,
                        halfTargetLength = targetLength / 2;
                        targetHoveAnimObj.d = [M, target.plotX - halfTargetLength, startY, L,
                            target.plotX + halfTargetLength, endY];
                    }

                }

                target.graphic = paper.path(target.shapeArgs, wGroup)
                .attr({
                    stroke : target.borderColor,
                    'stroke-width': targetBorderWidth,
                    'stroke-linecap': 'round',
                    ishot: true,
                    'shape-rendering': DECIDE_CRISPENING[(targetBorderWidth < 1)]
                })
                .click(function (data) {
                    var ele = this;
                    plotEventHandler.call(ele, renderer, data);
                })
                .hover(function (data) {
                    var ele = this;
                    plotEventHandler.call(ele, renderer, data, ROLLOVER);
                    if (targetRolloverProperties.enabled) {
                        ele.attr(targetRolloverProperties.hoverAttr);
                        if (targetRolloverProperties.showHoverAnimation) {
                            ele.animate(targetHoveAnimObj, 100, animEffect);
                        }
                    }
                }, function (data) {
                    var ele = this;
                    plotEventHandler.call(ele, renderer, data, ROLLOUT);
                    if (targetRolloverProperties.enabled) {
                        ele.attr(targetRolloverProperties.outAttr);
                        if (targetRolloverProperties.showHoverAnimation) {
                            ele.animate(targetOutAnimObj, 100, animEffect);
                        }
                    }
                })
                .tooltip(target.toolText)
                .data('eventArgs', eventArgs);
            }
        }

    }, renderer['renderer.widgetbase']);

    renderer('renderer.hbullet', {

        drawWidgetLabel: function (data) {

            var renderer = this,
            options = renderer.options,
            chartOptions = options.chart,
            layers = renderer.layers,
            paper = renderer.paper,
            dataLabelGroup = layers.datalabels,
            point = data[0],
            width = renderer.canvasWidth,
            height = renderer.canvasHeight,
            valuePadding = chartOptions.valuePadding,
            dataLabels = options.plotOptions.series.dataLabels,
            style = dataLabels.style,
            css = {
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                lineHeight: style.lineHeight,
                fontWeight: style.fontWeight,
                fontStyle: style.fontStyle
            },
            labelX;

            // create a separate group for the data labels to avoid rotation
            if (!dataLabelGroup) {
                dataLabelGroup = layers.datalabels = paper.group('datalabels').insertAfter(layers.dataset);
            }

            labelX = width + valuePadding;

            // only draw the point if y is defined
            if (point.y !== UNDEFINED && !isNaN(point.y) && (point.displayValue !== BLANKSTRING)) {
                point.dataLabel =
                    paper.text(labelX, height / 2, point.displayValue, dataLabelGroup)
                    .attr({
                        'text-anchor': textHAlign[POSITION_LEFT],
                        title: (point.originalText || ''),
                        fill: style.color,
                        'text-bound': [style.backgroundColor, style.borderColor,
                            style.borderThickness, style.borderPadding,
                            style.borderRadius, style.borderDash]
                    })
                    .css(css);

            }
        }

    }, renderer['renderer.bullet']);

    renderer('renderer.hlinear', {

        drawWidget: function () {

            var renderer = this,
            options = renderer.options,
            paper = renderer.paper,
            logic = renderer.logic,
            chartOptions = options.chart,
            scale = options.scale,
            elements = renderer.elements,
            wGroup = renderer.layers.dataset,
            width = renderer.canvasWidth,
            height = renderer.canvasHeight,
            min = scale.min,
            max = scale.max,
            trendArray = (scale && scale.trendPoint) || [],
            gaugeFillMix = chartOptions.colorRangeFillMix,
            gaugeFillRatio = chartOptions.colorRangeFillRatio,
            gaugeBorderColor = chartOptions.colorRangeBorderColor,
            gaugeBorderAlpha = chartOptions.colorRangeBorderAlpha,
            gaugeBorderThickness = chartOptions.colorRangeBorderThickness,
            gaugeType = 1,
            colorArray = logic.colorRangeGetter.getColorRangeArr(min, max),
            showShadow = chartOptions.showShadow,
            shadow,
            i,
            len,
            trendObj,
            colorGrp,
            getRectXY,
            angle,
            color,
            colorObj,
            borderColor,
            xyObj,
            shadowObj,
            startAngle,
            y,
            marker,
            orient,
            pointOrientation = renderer.pointOrientation = {
                top: 1,
                /*right: 0,
                left: 2,*/
                bottom: 3
            },
            // Color Manager for widgets
            colorM = logic.colorManager,
            crColor,
            crAlpha,
            borderAlpha,
            shadowAlpha;

            if (!elements.linear) {
                elements.linear = colorGrp = paper.group('colorrange', wGroup);
                //draw the outer rectangle
                elements.outerRect = paper.rect(colorGrp);
            }

            elements.outerRect.attr({
                x: 0,
                y: 0,
                width: width,
                height: height,
                stroke: 'none',
                r: 0
            });

            if (gaugeType === 1 ) { // horizontal gauge; left to right;
                getRectXY = function (minValue, maxValue) {
                    return {
                        x: ((minValue * width / (max - min))),
                        y: 0,
                        width: (maxValue - minValue) * width / (max - min),
                        height: height
                    };
                };
                angle = 270;

            } else if (gaugeType === 2) { // vertical gauge; top to bottom;
                getRectXY = function (minValue, maxValue) {
                    return {
                        x: 0,
                        y: (minValue * height / (max - min)),
                        width: width,
                        height: (maxValue - minValue) * height / (max - min)
                    };
                };
                angle = 180;

            } else if (gaugeType === 3) { // horizontal linear gauge; right to left;
                getRectXY = function (minValue, maxValue) {
                    return {
                        x: width - (maxValue * width / (max - min)),
                        y: 0,
                        width: (maxValue - minValue) * width / (max - min),
                        height: height
                    };
                };
                angle = 270;

            } else {  // vertical linear gauge; bottom to top;
                getRectXY = function (minValue, maxValue) {
                    return {
                        x: 0,
                        y: height - (maxValue * height / (max - min)),
                        width: width,
                        height: (maxValue - minValue) * height / (max - min)
                    };
                };
                angle = 180;
            }

            if (!elements.colorRangeElems) {
                elements.colorRangeElems = [];
            }

            for (i = 0, len = colorArray.length; i < len; i += 1) {
                colorObj = colorArray[i],
                xyObj = getRectXY((colorObj.minvalue - min), (colorObj.maxvalue - min));
                colorObj.x = xyObj.x;
                colorObj.y = xyObj.y;
                colorObj.width = xyObj.width;
                colorObj.height = xyObj.height;

                color = colorObj.code;
                borderColor = convertColor(getColorCodeString(color, gaugeBorderColor), gaugeBorderAlpha);

                shadow = showShadow ? (Math.max(colorObj.alpha, gaugeBorderAlpha) / 100) : null;

                //create the shadow element
                crColor = colorM.parseColorMix(colorObj.code, gaugeFillMix);
                crAlpha = colorM.parseAlphaList(colorObj.alpha, crColor.length);
                borderAlpha = pluckNumber(colorObj.borderAlpha, gaugeBorderAlpha);
                shadowAlpha = crAlpha.split(COMMASTRING);

                shadowAlpha = mathMax.apply(Math, shadowAlpha);
                shadowAlpha = mathMax(gaugeBorderThickness && borderAlpha || 0, shadowAlpha);

                if (!elements.colorRangeElems[i]) {
                    elements.colorRangeElems[i] = paper.rect(colorGrp);
                }

                elements.colorRangeElems[i].attr({
                    x: xyObj.x,
                    y: xyObj.y,
                    width: xyObj.width,
                    height: xyObj.height,
                    r: 0,
                    'stroke-width': gaugeBorderThickness,
                    stroke: borderColor,
                    'fill': toRaphaelColor({
                        FCcolor: {
                            color: crColor.toString(),
                            ratio: gaugeFillRatio,
                            alpha: crAlpha,
                            angle: angle
                        }
                    })
                })
                .shadow({
                    apply: showShadow,
                    opacity: (shadowAlpha / 100)
                });
            }

            while (elements.colorRangeElems[i]) {
                elements.colorRangeElems[i].remove();
                elements.colorRangeElems.splice(i, 1);
            }

            if (!elements.trendObjElems) {
                elements.trendObjElems = [];
            }

            for (i = 0, len = trendArray.length; i < len; i += 1) {
                trendObj = trendArray[i];
                xyObj = getRectXY((trendObj.startValue - min), (trendObj.endValue - min));

                if (trendObj.isZone) {
                    if (!elements.trendObjElems[i]) {
                        elements.trendObjElems[i] = paper.rect(colorGrp);
                    }
                    elements.trendObjElems[i].attr({
                        x: xyObj.x,
                        y: xyObj.y,
                        width: xyObj.width > 0 ? xyObj.width : 0,
                        height: xyObj.height > 0 ? xyObj.height : 0,
                        r: 0,
                        'stroke-width': 0,
                        fill: toRaphaelColor({
                            FCcolor: {
                                color: trendObj.color,
                                alpha: trendObj.alpha
                            }
                        })
                    })
                    .tooltip(trendObj.tooltext);
                }
                else {

                    elements.trendObjElems[i] = paper.path([M, xyObj.x, xyObj.y, L, xyObj.x,
                        (xyObj.y + xyObj.height)], colorGrp)
                    .attr({
                        stroke: convertColor(trendObj.color, trendObj.alpha),
                        'stroke-width': trendObj.thickness,
                        'stroke-dasharray': trendObj.dashStyle
                    })
                    .tooltip(trendObj.tooltext);
                }

                if (trendObj.useMarker) {
                    if (trendObj.showOnTop) {
                        orient = 'bottom';
                        y = 0;
                    } else {
                        orient = 'top';
                        y = height;
                    }
                    startAngle = pointOrientation[orient] * 90;

                    shadowObj = {
                        apply: showShadow,
                        opacity: 1
                    };

                    trendObj.graphic = marker = paper.polypath(3, xyObj.x, y,
                        trendObj.markerRadius, startAngle, 0, wGroup)
                        .attr({
                            fill: trendObj.markerColor,
                            stroke: trendObj.markerBorderColor,
                            'stroke-width': 1
                        })
                        .shadow({
                            apply: chartOptions.showShadow
                        })
                        .tooltip(trendObj.tooltext);
                }

            }

            while (elements.trendObjElems[i]) {
                elements.trendObjElems[i].remove();
                elements.trendObjElems.splice(i, 1);
            }
        },

        drawWidgetValue: function (dataArr, animation) {
            var renderer = this,
            options = renderer.options,
            i = (dataArr && dataArr.length) || 0,
            chartOptions = options.chart,
            pointOrientation = renderer.pointOrientation,
            gaugeType = 1,
            drawOptions = {
                point: [],
                showPointerShadow: chartOptions.showPointerShadow
            },
            orient,
            pointerOnOpp = chartOptions.pointerOnOpp;

            if (gaugeType === 1 ) { // horizontal gauge; left to right;
                orient = (pointerOnOpp) ? 'top' : 'bottom';

            } else if (gaugeType === 2) { // vertical gauge; top to bottom;
                orient = pointerOnOpp ? 'left' : 'right';

            } else if (gaugeType === 3) { // horizontal linear gauge; right to left;
                orient = (pointerOnOpp) ? 'top' : 'bottom';

            } else {  // vertical linear gauge; bottom to top;
                orient = pointerOnOpp ? 'left' : 'right';
            }

            renderer.dataById = {};

            while (i--) {
                drawOptions.point[i] = {
                    startAngle: pointOrientation[orient] * 90
                };
            }
            renderer.drawPointerValues(null, animation, drawOptions);

        },

        drawPointerValues: function (dataArr, animation, drawOptions) {

            var renderer = this,
            wGroup = renderer.layers.dataset,
            options = renderer.options,
            elements = renderer.elements,
            paper = renderer.paper,
            scale = options.scale,
            chartData = ((options.series && options.series[0] && options.series[0].data) || []),
            width = renderer.canvasWidth,
            height = renderer.canvasHeight,
            pointerY = (options.chart.pointerOnOpp ? height : 0),
            showPointerShadow = options.chart.showPointerShadow,
            showTooltip = (options.tooltip.enabled !== false),
            pxValueFactor = (scale.max - scale.min) / width,
            min = scale.min,
            max = scale.max,
            i = chartData.length,
            point,
            prevData,
            shadowObj,
            startAngle,

            stubEvent = {
                pageX: 0,
                pageY: 0
            },
            pointerDragStart = function (x) {

                var point = this,
                chartObj = renderer.fusionCharts;

                prevData = chartObj.getDataJSON();
                point.dragStartX = x;
            },
            pointerDragEnd = function () {

                var point = this,
                jsVars,
                chartObj = renderer.fusionCharts;

                jsVars = chartObj && chartObj.jsVars;
                jsVars && (jsVars._rtLastUpdatedData = chartObj.getDataJSON());

                global.raiseEvent('RealTimeUpdateComplete', {
                    data: '&value=' + point.updatedValStr,
                    updateObject: {values: [point.updatedValStr]},
                    prevData: prevData.values,
                    source: 'editMode',
                    url: null
                }, chartObj);

                try {
                    /* jshint camelcase: false*/
                    win.FC_ChartUpdated && win.FC_ChartUpdated(chartObj.id);
                    /* jshint camelcase: true*/
                }
                catch (err) {
                    setTimeout(function () {
                        throw (err);
                    }, 1);
                }

                point.graphic.tooltip(point.toolText);
            },
            pointerOnDrag = function (dx, dy, x, y, event) {

                var point = this,
                touchEvent = (hasTouch && getTouchEvent(event)) || stubEvent,
                pointVal = pluckNumber(point.y, scale.min),
                diffX = point.dragStartX - x,
                newVal = pointVal - (diffX * pxValueFactor),
                i = 0,
                values = [];

                if (newVal < scale.min) {
                    newVal = scale.min;
                } else if (newVal > scale.max) {
                    newVal = scale.max;
                }

                for (;i < point.index; i += 1) {
                    values.push('');
                }
                values.push(newVal);

                if (pointVal !== newVal && renderer.realtimeUpdate({
                    values: values
                }, {duration: 0})) {
                    point.updatedValStr = values.join('|');
                    point.dragStartX = (x || event.pageX || touchEvent.pageX);
                }
            },
            link,
            rolloverProperties,
            eventArgs,
            clickHandler,
            hoverRollOver,
            hoverRollOut;

            clickHandler = function (data) {
                var ele = this;
                plotEventHandler.call(ele, renderer, data);
            };

            hoverRollOver = function (data) {
                var ele = this,
                    rolloverProperties = ele.data('rolloverProperties');
                if (rolloverProperties.enabled) {
                    ele.attr(rolloverProperties.hoverAttr);
                    if (rolloverProperties.hoverAnimAttr) {
                        ele.animate(rolloverProperties.hoverAnimAttr, 100, ANIM_EFFECT);
                    }
                }
                plotEventHandler.call(ele, renderer, data, ROLLOVER);
            };

            hoverRollOut = function (data) {
                var ele = this,
                    rolloverProperties = ele.data('rolloverProperties');
                if (rolloverProperties.enabled) {
                    ele.attr(rolloverProperties.outAttr);
                    if (rolloverProperties.outAnimAttr) {
                        ele.animate(rolloverProperties.outAnimAttr, 100, ANIM_EFFECT);
                    }
                }
                plotEventHandler.call(ele, renderer, data, ROLLOUT);
            };

            while (i--) {
                point = chartData[i];
                rolloverProperties = point.rolloverProperties || {};
                startAngle = (drawOptions && drawOptions.point[i] && drawOptions.point[i].startAngle) ||
                    point._startAngle;
                /**
                 * @note
                 * The slight increment in starting angle is done to avoid getting
                 * angles in multiples of 90 degree (default starting angle is 270).
                 * Issue is like, cos(270 deg) is not zero but in the range of e-16,
                 * when VML silently fails to render.
                 */
                startAngle += 0.2;

                if (!elements.pointers) {
                    elements.pointers = [];
                }

                if (!elements.pointers[i]) {

                    if (point.id !== undefined) {
                        renderer.dataById[point.id] = {
                            index: i,
                            point: point
                        };
                    }

                    shadowObj = showPointerShadow ? {
                        opacity: (Math.max(point.bgalpha, point.borderalpha) / 100)
                    } : false;

                    link = point.editMode ? undefined : point.link;

                    eventArgs = {
                        link: link,
                        value: point.y,
                        displayValue: point.displayValue,
                        toolText: point.toolText
                    };

                    point.graphic = elements.pointers[i] = paper.polypath(
                        point.sides,
                        0,
                        (pointerY || 0),
                        point.radius,
                        startAngle,
                        0,
                        wGroup
                    ).attr({
                        fill: point.color,
                        stroke: point.borderColor,
                        ishot: true,
                        r: point.radius,
                        'stroke-width': point.borderWidth
                    })
                    .shadow(!!shadowObj, shadowObj && shadowObj.opacity)
                    .click(clickHandler)
                    .hover(hoverRollOver, hoverRollOut)
                    .data('eventArgs', eventArgs)
                    .data('rolloverProperties', rolloverProperties);

                    link && point.graphic.css({
                        cursor: 'pointer',
                        '_cursor': 'hand'
                    });

                    point._startAngle = startAngle;

                    if (point.editMode) {
                        point.index = i;
                        point.graphic
                            .css({
                                cursor: 'pointer',
                                '_cursor': 'hand'
                            })
                            .attr({
                                ishot: true
                            });

                        point.graphic.drag(pointerOnDrag, pointerDragStart, pointerDragEnd, point, point, point);
                    }
                }

                point.graphic = elements.pointers[i];
                showTooltip && point.graphic.tooltip(point.toolText);

                if (animation && animation.duration) {
                    point.graphic.animate({
                        polypath: [
                            point.sides,
                            width * (pluckNumber(point.y, min) - min) / (max - min),
                            (pointerY || 0),
                            point.radius,
                            startAngle,
                            0
                        ]
                    },
                        animation.duration,
                        ANIM_EFFECT
                    );
                }
                else {
                    point.graphic.attr({
                        polypath: [
                            point.sides,
                            width * (pluckNumber(point.y, min) - min) / (max - min),
                            (pointerY || 0),
                            point.radius,
                            startAngle,
                            0
                        ]
                    });
                }
            }
        },

        drawWidgetLabel: function (dataArr, animation) {

            var renderer = this,
            options = renderer.options,
            scale = options.scale,
            layers = renderer.layers,
            paper = renderer.paper,
            chartOptions = options.chart,
            chartAPI = renderer.logic,
            dataLabelsGroup = layers.datalabels || (layers.datalabels = paper.group('datalabels').
                insertAfter(layers.dataset)),
            min = scale.min,
            max = scale.max,
            gaugeType = 1, //series.gaugeType,
            colorArr = chartAPI.colorRangeGetter.getColorRangeArr(min, max),
            numberFormatter = chartAPI.numberFormatter,
            colorRangeStyle = chartOptions.colorRangeStyle.style || {},
            colorObj,
            width = renderer.canvasWidth,
            height = renderer.canvasHeight,
            trendArr = (scale && scale.trendPoint) || [],
            pointerOnOpp = chartOptions.pointerOnOpp,
            valueInsideGauge = chartOptions.valueInsideGauge,
            showGaugeLabels = chartOptions.showGaugeLabels,
            style = options.plotOptions.series.dataLabels.style,
            colorArrLabel, maxWidth, truncatedWidth,
            i, length, pointerObj, getPointerLabelXY, getColorLabelXY, labelXY, trendObj,
            nextPointer, nextOriText, nextSmartText, nextXY, labelGap, isSameLevel = false, j,
            smartLabel = renderer.smartLabel, smartText, testStrObj, minWidth, labelX, labelY,
            lineHeight = pluckNumber(parseInt(style.fontHeight, 10), parseInt(style.lineHeight, 10), 12),
            labelPadding = (chartOptions.valuePadding + (lineHeight * 0.5)), hPad = 4,
            innerLabelPadding = 4, trendLabelPadding = chartOptions.valuePadding, oppTrendLabelPadding = labelPadding,
            css = {
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                lineHeight: style.lineHeight,
                fontWeight: style.fontWeight,
                fontStyle: style.fontStyle
            };

            // if label is below the pointer then we need to add extra pdding to compensate for lineheight.
            labelPadding = (valueInsideGauge === pointerOnOpp) ? labelPadding - (lineHeight / 4) :
                labelPadding + (lineHeight / 4);

            smartLabel.setStyle(css);
            testStrObj = smartLabel.getOriSize('W...');
            minWidth = testStrObj.width;

            if (gaugeType === 1 ) { // horizontal gauge; left to right;
                getPointerLabelXY = renderer.getPointerLabelXY = function (value, isInside, pointerOnOpp, xsHeight) {
                    var y;
                    if (pointerOnOpp) {
                        y = isInside ? (height - xsHeight - labelPadding) : (height + labelPadding);
                    } else {
                        y = isInside ? labelPadding : -(labelPadding + xsHeight);
                    }
                    return {
                        x: ((value - min) * width / (max - min)),
                        y: y,
                        align: 'middle'
                    };
                };

                getColorLabelXY = function (minvalue, maxvalue) {
                    return {
                        x: (((minvalue - min) + (maxvalue - minvalue) / 2) * width / (max - min)),
                        y: (height / 2),
                        width: (maxvalue - minvalue) * width / (max - min),
                        height: height
                    };
                };

            } else if (gaugeType === 2) { // vertical gauge; top to bottom;
                getPointerLabelXY = renderer.getPointerLabelXY = function (value, isInside, pointerOnOpp) {
                    var x, align;
                    if (pointerOnOpp) {
                        if (isInside) {
                            align = POSITION_RIGHT;
                            x = width - labelPadding;
                        } else {
                            align = POSITION_LEFT;
                            x = width + labelPadding;
                        }
                    }
                    else {
                        if (isInside) {
                            align = POSITION_LEFT;
                            x = labelPadding;
                        }
                        else {
                            align = POSITION_RIGHT;
                            x = -labelPadding;
                        }
                    }
                    return {
                        x: x,
                        y: (value * height / (max - min)),
                        align: align
                    };
                };

                getColorLabelXY = function (minvalue, maxvalue) {
                    return {
                        y: (((minvalue - min) + (maxvalue - minvalue) / 2) * height / (max - min)),
                        x: (width / 2),
                        height: (maxvalue - minvalue) * height / (max - min),
                        width: width
                    };
                };

            }
            else if (gaugeType === 3) { // horizontal linear gauge; right to left;
                getPointerLabelXY = renderer.getPointerLabelXY = function (value, isInside, pointerOnOpp) {
                    var y;
                    if (pointerOnOpp) {
                        y = isInside ? height - labelPadding : height + labelPadding;
                    } else {
                        y = isInside ? labelPadding : -labelPadding;
                    }
                    return {
                        x: width - ((value - min) * width / (max - min)),
                        y: y,
                        align: POSITION_MIDDLE
                    };
                };

                getColorLabelXY = function (minvalue, maxvalue) {
                    return {
                        x: width - (((minvalue - min) + (maxvalue - minvalue) / 2) * width / (max - min)),
                        y: (height / 2),
                        width: (maxvalue - minvalue) * width / (max - min),
                        height: height
                    };
                };

            }
            else {  // vertical linear gauge; bottom to top;
                getPointerLabelXY = renderer.getPointerLabelXY = function (value, isInside, pointerOnOpp) {
                    var x, align;
                    if (pointerOnOpp) {
                        if (isInside) {
                            align = POSITION_RIGHT;
                            x = width - labelPadding;
                        } else {
                            align = POSITION_LEFT;
                            x = width + labelPadding;
                        }
                    } else {
                        if (isInside) {
                            align = POSITION_LEFT;
                            x = labelPadding;
                        } else {
                            align = POSITION_RIGHT;
                            x = -labelPadding;
                        }
                    }
                    return {
                        x: x,
                        y: height - (value * height / (max - min)),
                        align: align
                    };
                };

                getColorLabelXY = function (minvalue, maxvalue) {
                    return {
                        y: height - (((minvalue - min) + (maxvalue - minvalue) / 2) * height / (max - min)),
                        x: (width / 2),
                        height: (maxvalue - minvalue) * height / (max - min),
                        width: width
                    };
                };
            }

            if (dataArr && dataArr.length) {
                i = dataArr.length;
                while (i--) {
                    pointerObj = dataArr[i];

                    if (pointerObj.showvalue !== 0 && pointerObj.displayValue !== BLANKSTRING) {

                        smartText = smartLabel.getOriSize(pointerObj.displayValue);
                        if (pointerObj.setWidth) {
                            smartText = smartLabel.getSmartText(pointerObj.displayValue,
                                pointerObj.setWidth, smartText.height, true);
                        }

                        labelXY = renderer.getPointerLabelXY(pointerObj.y, valueInsideGauge,
                            pointerOnOpp, (smartText.height / 2));

                        if (pointerObj.isLabelString) {

                            isSameLevel = false, j = 1;
                            while (!isSameLevel) {
                                nextPointer = dataArr[i + j];
                                if (!nextPointer) {
                                    break;
                                }

                                if (nextPointer.isLabelString) {
                                    isSameLevel = true;
                                }
                                else {
                                    j += 1;
                                }
                            }

                            if (nextPointer) {
                                nextOriText = smartLabel.getOriSize(nextPointer.displayValue);
                                nextXY = getPointerLabelXY(nextPointer.y, valueInsideGauge,
                                    pointerOnOpp, (nextOriText.height / 2));

                                //calculate the overlapping area's width
                                labelGap = (nextXY.x - (nextOriText.width / 2)) - (labelXY.x + (smartText.width / 2));
                                // get the max width i.e the distance between the pointers
                                maxWidth = nextXY.x - labelXY.x;
                                if (labelGap < 0) {

                                    // calculate the truncated width using labelGap (should be -ve)
                                    truncatedWidth = smartText.width + labelGap;

                                    // the truncated width cannot be more than max width.
                                    if (truncatedWidth > maxWidth) {
                                        pointerObj.setWidth = truncatedWidth = maxWidth;
                                    }
                                    if (truncatedWidth > minWidth) {
                                        if (pointerObj.setWidth && pointerObj.setWidth <= truncatedWidth) {
                                            nextSmartText = smartLabel.getSmartText(
                                                pointerObj.displayValue, pointerObj.setWidth, smartText.height, true);
                                            pointerObj.displayValue = nextSmartText.text;
                                            nextSmartText.tooltext &&
                                                (pointerObj.originalText = nextSmartText.tooltext);
                                        }
                                        else {
                                            nextSmartText = smartLabel.getSmartText(
                                                pointerObj.displayValue, truncatedWidth, smartText.height, true);
                                            pointerObj.displayValue = nextSmartText.text;
                                            nextSmartText.tooltext &&
                                                (pointerObj.originalText = nextSmartText.tooltext);
                                        }
                                    }
                                    else {
                                        nextSmartText = smartLabel.getSmartText(
                                            pointerObj.displayValue, minWidth, smartText.height, true);
                                        pointerObj.displayValue = nextSmartText.text;
                                        nextSmartText.tooltext && (pointerObj.originalText = nextSmartText.tooltext);
                                        // since the labelGap was not split equally we have to recalculate
                                        // labelGap so that the next label will adjust accordingly.
                                        labelGap = labelGap * 2 + minWidth - hPad;
                                    }

                                    pointerObj.setWidth = null;

                                    truncatedWidth = nextOriText.width + labelGap - hPad;
                                    if (truncatedWidth > maxWidth) {
                                        nextPointer.setWidth = maxWidth;
                                    }
                                    else if (truncatedWidth > minWidth) {
                                        nextPointer.setWidth = truncatedWidth;
                                    }
                                    else {
                                        nextPointer.setWidth = minWidth;
                                    }
                                }
                            }

                            if (pointerObj.setWidth) {
                                nextSmartText = smartLabel.getSmartText(
                                    pointerObj.displayValue, pointerObj.setWidth, smartText.height, true);
                                pointerObj.displayValue = nextSmartText.text;
                                nextSmartText.tooltext && (pointerObj.originalText = nextSmartText.tooltext);
                                pointerObj.setWidth = null;
                            }
                        }
                    }
                }
            }

            renderer.drawPointerLabels(null, animation);

            colorRangeStyle = colorRangeStyle || {};
            smartLabel.setStyle(colorRangeStyle);

            // Draw the colorRange labels
            if (colorArr && showGaugeLabels) {
                for (i = 0, length = colorArr.length; i < length; i += 1) {
                    colorObj = colorArr[i];
                    colorArrLabel = pluck(colorObj.label, colorObj.name);
                    if (defined(colorArrLabel) && colorArrLabel !== BLANK) {
                        labelXY = getColorLabelXY(colorObj.minvalue, colorObj.maxvalue);
                        if ((labelXY.width - innerLabelPadding) > minWidth &&
                                (labelXY.height - innerLabelPadding) > lineHeight) {
                            smartText = smartLabel.getSmartText(colorArrLabel,
                                labelXY.width - innerLabelPadding, labelXY.height - innerLabelPadding);
                        }
                        else {
                            smartText = smartLabel.getSmartText(colorArrLabel, labelXY.width, labelXY.height);
                        }

                        paper.text(dataLabelsGroup)
                        .attr({
                            'text-anchor': POSITION_MIDDLE,
                            title: (smartText.tooltext || ''),
                            'vertical-align': POSITION_MIDDLE,
                            text: smartText.text,
                            x: labelXY.x,
                            y: labelXY.y,
                            fill: colorRangeStyle.color
                        })
                        .css(colorRangeStyle);
                    }
                }
            }

            if (trendArr) {
                for (i = 0, length = trendArr.length; i < length; i += 1) {
                    trendObj = trendArr[i];
                    trendObj.displayValue = pluck(trendObj.displayValue,
                        numberFormatter.dataLabels(trendObj.startValue));
                    smartLabel.setStyle(trendObj.style);
                    lineHeight = smartLabel.getOriSize('Wg').height;
                    smartText = smartLabel.getOriSize(trendObj.displayValue);
                    labelXY = getPointerLabelXY(trendObj.startValue, 0, !trendObj.showOnTop);
                    if (trendObj.setWidth) {
                        smartText = smartLabel.getSmartText(trendObj.displayValue,
                            trendObj.setWidth, smartText.height, true);
                    }
                    isSameLevel = false, j = 1;
                    while (!isSameLevel) {
                        nextPointer = trendArr[i + j];
                        if (!nextPointer) {
                            break;
                        }

                        if (nextPointer.showOnTop === trendObj.showOnTop) {
                            isSameLevel = true;
                        }
                        else {
                            j += 1;
                        }
                    }
                    if (nextPointer) {
                        nextOriText = smartLabel.getOriSize(nextPointer.displayValue);
                        nextXY = getPointerLabelXY(nextPointer.startValue, 0, !nextPointer.showOnTop);

                        // refer to the docs of pointer label drawing above.
                        labelGap = (nextXY.x - (nextOriText.width / 2)) - (labelXY.x + (smartText.width / 2));
                        if (labelGap < 0) {
                            maxWidth = nextXY.x - labelXY.x;
                            truncatedWidth = smartText.width + labelGap;
                            if (truncatedWidth > maxWidth) {
                                trendObj.setWidth = truncatedWidth = maxWidth;
                            }
                            if (truncatedWidth > minWidth) {
                                if (trendObj.setWidth && (trendObj.setWidth <= truncatedWidth)) {
                                    smartText = smartLabel.getSmartText(trendObj.displayValue,
                                        trendObj.setWidth, smartText.height, true);
                                    trendObj.displayValue = smartText.text;
                                    smartText.tooltext && (trendObj.originalText = smartText.tooltext);
                                }
                                else {
                                    smartText = smartLabel.getSmartText(trendObj.displayValue,
                                        smartText.width + labelGap - hPad, smartText.height, true);
                                    trendObj.displayValue = smartText.text;
                                    smartText.tooltext && (trendObj.originalText = smartText.tooltext);
                                }
                            }
                            else {
                                smartText = smartLabel.getSmartText(
                                    trendObj.displayValue, minWidth, smartText.height, true);
                                trendObj.displayValue = smartText.text;
                                smartText.tooltext && (trendObj.originalText = smartText.tooltext);
                                labelGap = labelGap * 2 + minWidth - hPad;
                            }

                            trendObj.setWidth = null;

                            truncatedWidth = nextOriText.width + labelGap - hPad;
                            if (truncatedWidth > maxWidth) {
                                nextPointer.setWidth = maxWidth;
                            }
                            else if (truncatedWidth > minWidth) {
                                nextPointer.setWidth = truncatedWidth;
                            }
                            else {
                                nextPointer.setWidth = minWidth;
                            }
                        }
                    }

                    if (trendObj.setWidth) {
                        smartText = smartLabel.getSmartText(trendObj.displayValue, trendObj.setWidth,
                            smartText.height, true);
                        trendObj.displayValue = smartText.text;
                        smartText.tooltext && (trendObj.originalText = smartText.tooltext);
                        trendObj.setWidth = null;
                    }

                    labelY = trendObj.showOnTop ? -(trendLabelPadding + (smartText.height / 2)) :
                        height + oppTrendLabelPadding;
                    labelX = trendObj.isZone ? getColorLabelXY(trendObj.startValue, trendObj.endValue).x : labelXY.x;
                    trendObj.dataLabel = paper.text(0, labelY, trendObj.displayValue, dataLabelsGroup)
                        .attr({
                            'text-anchor': textHAlign[labelXY.align],
                            title: (trendObj.originalText || '')
                        })
                        .css(trendObj.style);

                    trendObj.dataLabel.attr({
                        x: labelX
                    });
                }
            }
        },

        drawPointerLabels: function (dataArr, animation) {

            var renderer = this,
            dataLabelsGroup = renderer.layers.datalabels,
            paper = renderer.paper,
            options = renderer.options,
            chartOptions = options.chart,
            pointerOnOpp = chartOptions.pointerOnOpp,
            valueInsideGauge = chartOptions.valueInsideGauge,
            smartLabel = renderer.smartLabel,
            chartData = ((options.series && options.series[0] && options.series[0].data) || []),
            style = options.plotOptions.series.dataLabels.style,
            i = chartData.length,
            css = {
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                lineHeight: style.lineHeight,
                fontWeight: style.fontWeight,
                fontStyle: style.fontStyle
            },
            displayValue,
            pointerObj,
            labelXY,
            smartText;

            dataArr = dataArr || [];

            while (i--) {
                pointerObj = chartData[i];
                displayValue = pointerObj.displayValue;

                if (pointerObj.showvalue !== 0 && displayValue !== BLANKSTRING) {

                    smartText = smartLabel.getOriSize(displayValue);
                    labelXY = renderer.getPointerLabelXY(pointerObj.y,
                        valueInsideGauge, pointerOnOpp, (smartText.height / 2));

                    if (!pointerObj.dataLabel) {
                        pointerObj.dataLabel = paper.text(dataLabelsGroup)
                        .attr({
                            'text-anchor': textHAlign[labelXY.align],
                            title: (pointerObj.originalText || ''),
                            text: displayValue,
                            x: 0,
                            y: labelXY.y,
                            fill: style.color,
                            'text-bound': [style.backgroundColor, style.borderColor,
                                style.borderThickness, style.borderPadding,
                                style.borderRadius, style.borderDash]
                        })
                        .css(css);

                        /*
                        if (style.backgroundColor || style.borderColor) {
                            pointerObj.dataLabel.attr({
                                'text-bound': [style.backgroundColor, style.borderColor, 1, '2']
                            });
                        }*/
                    }
                    else {
                        pointerObj.dataLabel.attr({
                            text: displayValue,
                            title: (pointerObj.originalText || '')
                        });
                    }

                    if (animation && animation.duration) {
                        pointerObj.dataLabel.animate({
                            x: labelXY.x
                        }, animation.duration, ANIM_EFFECT);
                    }
                    else {
                        pointerObj.dataLabel.attr({
                            x: labelXY.x
                        });
                    }
                }
            }
        },

        realtimeUpdate: function (updateObj, animation) {

            if (updateObj === this.lastUpdatedObj) {
                return false;
            }

            var renderer = this,
                options = renderer.options,
                HCConfig = options[CONFIGKEY],
                series = options.series,
                numberFormatter = renderer.numberFormatter,
                dataArr = (series && series[0] && series[0].data),
                values = updateObj.values || [],
                labels = updateObj.labels || [],
                toolTexts = updateObj.toolTexts || [],
                showLabels = updateObj.showLabels || [],
                i = (dataArr && dataArr.length) || 0,
                dataObj,
                data,
                tooltext,
                formatedValue = null,
                newData = [],
                pointObj;
            //use the realtime animation value or the default animation value
            animation = animation || (options.plotOptions.series.animation);

            if (i) {
                while (i--) {
                    dataObj = {};
                    pointObj = {};
                    data = dataArr[i];
                    if (values[i] !== undefined && values[i] !== '') {
                        dataObj.value = pointObj.value = values[i];
                        formatedValue = pointObj.displayvalue =
                            pointObj.tooltext = numberFormatter.dataLabels(pointObj.value);
                        pointObj.hasNewData = true;
                    }
                    else {
                        pointObj.value = data.y;
                    }

                    if (labels[i]) {
                        pointObj.displayvalue = labels[i];
                        pointObj.hasNewData = true;
                    }

                    if (showLabels[i] == '0') {
                        pointObj.displayvalue = BLANKSTRING;
                        pointObj.hasNewData = true;
                    }
                    tooltext = getValidValue(parseUnsafeString(pluck(data._tooltext, HCConfig.tooltext)));
                    if (toolTexts[i]) {
                        tooltext = getValidValue(parseUnsafeString(toolTexts[i]));
                        pointObj.hasNewData = true;
                    }

                    if (pointObj.hasNewData) {
                        newData[i] = pointObj;
                        extend2(data, {
                            y: pointObj.value,
                            displayValue: ((data.displayValue || showLabels[i] == '1') ?
                                pointObj.displayvalue : BLANKSTRING),
                            toolText: tooltext !== undefined ? parseTooltext(tooltext, [1,2], {
                                formattedValue: formatedValue
                            }, dataObj) : formatedValue
                        });
                    }
                }

                if (newData.length) {
                    this.lastUpdatedObj = updateObj;
                    this.drawPointerValues(dataArr, animation);
                    this.drawPointerLabels(dataArr, animation);
                }

                return Boolean(newData.length);
            }
        }

    }, renderer['renderer.widgetbase']);

    renderer('renderer.angular', {

        drawWidget: function () {

            var renderer = this,
                options = renderer.options,
                chartOptions = options.chart,
                scale = options.scale,
                drawOptions = options.series[0],
                paper = renderer.paper,
                elements = renderer.elements,
                wGroup = renderer.layers.dataset,
                gaugeOuterRadius = drawOptions.gaugeOuterRadius,
                gaugeInnerRadius = drawOptions.gaugeInnerRadius,
                gaugeFillRatio = drawOptions.gaugeFillRatio,
                gaugeBorderColor = chartOptions.gaugeBorderColor,
                gaugeBorderThickness = chartOptions.gaugeBorderThickness,
                gaugeBorderAlpha = chartOptions.gaugeBorderAlpha,
                gaugeFillMix = drawOptions.gaugeFillMix,
                x = drawOptions.gaugeOriginX,
                y = drawOptions.gaugeOriginY,
                startAngle = chartOptions.gaugeStartAngle,
                endAngle = chartOptions.gaugeEndAngle,
                showShadow = chartOptions.showShadow,
                minValue = scale.min,
                maxValue = scale.max,
                chartAPI = renderer.logic,
                colorRange = chartAPI.colorRangeGetter.getColorRangeArr(minValue, maxValue),
                i = 0, ln = colorRange.length,
                valueRange = maxValue - minValue,
                angleRange = endAngle - startAngle,
                colorObj, currentEndAngle,
                lastAngle = startAngle,
                cosTh = Math.cos(startAngle),
                sinTh = Math.sin(startAngle),
                startX = x + (gaugeOuterRadius * cosTh),
                startY = y + (gaugeOuterRadius * sinTh),
                startX1 = x + (gaugeInnerRadius * cosTh),
                startY1 = y + (gaugeInnerRadius * sinTh),
                nextAngle,
                crColor, crAlpha, crRatio, shadowAlpha,
                trendPoint = scale.trendPoint,
                borderColor,
                borderAlpha,
                fcColorObj,
                trendObj, trendStartAngle, trendEndAngle, trendRadius, trendInnerRadius, isZone,
                sides, marker, textValue, textRadius, align, stHeight, trendValueDistance,
                limitingValue,
                style,
                limitingNegValue, bboxObj;

            // Create the TM Group
            if (!elements.trendPointGroup) {
                elements.trendPointGroup = paper.group('trendpoint', wGroup);
            }

            //draw all color Bands
            for (; i < ln; i += 1) {
                colorObj = colorRange[i];
                currentEndAngle = startAngle + (((Math.min(colorObj.maxvalue, maxValue) - minValue) /
                    valueRange) * angleRange);

                //Parse the color, alpha and ratio array for each color range arc.
                crColor = chartAPI.parseColorMix(colorObj.code, gaugeFillMix);
                crAlpha = chartAPI.parseAlphaList(colorObj.alpha, crColor.length);
                crRatio = chartAPI.parseRatioList((gaugeInnerRadius / gaugeOuterRadius * 100) +
                    gaugeFillRatio, crColor.length);

                borderColor = colorObj.bordercolor;
                borderAlpha = pluckNumber(colorObj.borderAlpha, gaugeBorderAlpha);
                //Set border propeties
                //Which border color to use - between actual color and color mix specified?
                if (borderColor && borderColor.indexOf('{') == -1) {
                    borderColor = convertColor(borderColor, borderAlpha);
                }
                else {
                    borderColor = chartAPI.parseColorMix(colorObj.code, pluck(borderColor, gaugeBorderColor))[0];
                }
                borderColor = convertColor(borderColor, borderAlpha);
                //create the shadow element
                shadowAlpha = crAlpha.split(COMMASTRING);
                shadowAlpha = mathMax.apply(Math, shadowAlpha);
                shadowAlpha = showShadow ?
                    mathMax(gaugeBorderThickness && borderAlpha || 0, shadowAlpha) : 0;

                // If start angle > end angle then swap the two for intended
                // behavior.
                nextAngle = currentEndAngle;
                if (lastAngle > currentEndAngle) {
                    lastAngle += (currentEndAngle);
                    currentEndAngle = lastAngle - currentEndAngle;
                    lastAngle = lastAngle - currentEndAngle;
                }

                paper.ringpath(x, y, gaugeOuterRadius, gaugeInnerRadius, lastAngle, currentEndAngle, wGroup)
                    .attr({
                        fill:  toRaphaelColor({
                            FCcolor : {
                                cx: x,
                                cy: y,
                                r: gaugeOuterRadius,
                                gradientUnits: 'userSpaceOnUse',
                                color:  crColor.join(),
                                alpha: crAlpha,
                                ratio: crRatio,
                                radialGradient: true
                            }
                        }),
                        'stroke-width': gaugeBorderThickness,
                        stroke: borderColor
                    })
                    .shadow({
                        apply: showShadow,
                        opacity : (shadowAlpha / 100)
                    });

                lastAngle = nextAngle;
            }

            // Create the TM Group
            if (!elements.tickMarkGroup) {
                elements.tickMarkGroup = paper.group('tickmark', wGroup);
            }
            // Create the TM Group
            if (!elements.trendMarkerGroup) {
                elements.trendMarkerGroup = paper.group('trendmarker', wGroup);
            }
            // Create the Point Group
            if (!elements.pointGroup) {
                elements.pointGroup = paper.group('pointers', wGroup).translate(x, y);
            }

            // Now draw the pivot
            if (!elements.pivot) {
                elements.pivot = paper.circle(wGroup);
            }

            fcColorObj = drawOptions.isRadialGradient ? {
                color: drawOptions.pivotFillColor,
                alpha: drawOptions.pivotFillAlpha,
                ratio: drawOptions.pivotFillRatio,
                radialGradient: true,
                angle: drawOptions.pivotFillAngle,
                cx : 0.5,
                cy : 0.5,
                r : '50%'
            } : {
                color: drawOptions.pivotFillColor,
                alpha: drawOptions.pivotFillAlpha,
                ratio: drawOptions.pivotFillRatio,
                radialGradient: false,
                angle: drawOptions.pivotFillAngle
            };

            elements.pivot.attr({
                cx: x,
                cy: y,
                r: drawOptions.pivotRadius,
                fill: toRaphaelColor({
                    FCcolor: fcColorObj
                }),
                'stroke-width': drawOptions.pivotBorderThickness,
                stroke: drawOptions.pivotBorderColor
            })
            .shadow({
                apply: showShadow
            });

            sides = '3';
            limitingValue = Math.cos(89.99 * deg2rad);
            limitingNegValue = -limitingValue;

            //Now create all trend points
            //draw all color Bands
            for (i = 0, ln = trendPoint.length; i < ln; i += 1) {
                trendObj = trendPoint[i];
                isZone = trendObj.isZone;
                trendStartAngle = startAngle + (((trendObj.startValue - minValue) / valueRange) * angleRange);
                trendRadius = pluckNumber(trendObj.radius, gaugeOuterRadius);
                trendInnerRadius = pluckNumber(trendObj.innerRadius, isZone ?
                    Math.max(gaugeInnerRadius-15, 0): gaugeInnerRadius);
                trendValueDistance = pluckNumber(trendObj.trendValueDistance, 0);

                cosTh = Math.cos(trendStartAngle);
                sinTh = Math.sin(trendStartAngle);
                startX = x + (trendRadius * cosTh);
                startY = y + (trendRadius * sinTh);
                startX1 = x + (trendInnerRadius * cosTh);
                startY1 = y + (trendInnerRadius * sinTh);

                if (isZone) {
                    trendEndAngle = startAngle + (((trendObj.endValue - minValue) / valueRange) * angleRange);

                    // If start angle > end angle then swap the two for intended
                    // behavior.
                    if (trendStartAngle > trendEndAngle) {
                        trendStartAngle += (trendEndAngle);
                        trendEndAngle = trendStartAngle - trendEndAngle;
                        trendStartAngle = trendStartAngle - trendEndAngle;
                    }

                    trendObj.graphic =
                        paper.ringpath(x, y, trendRadius, trendInnerRadius, trendStartAngle,
                            trendEndAngle, elements.trendPointGroup)
                        .attr({
                            fill:  convertColor(trendObj.color, trendObj.alpha),
                            'stroke-width': (trendObj.showBorder ? trendObj.thickness : 0),
                            stroke: trendObj.borderColor,
                            'stroke-dasharray': trendObj.dashStyle
                        });
                }
                else {
                    trendObj.graphic =
                        paper.path([M, startX, startY, L, startX1, startY1], elements.tickMarkGroup)
                        .attr({
                            'stroke-width': trendObj.showBorder ? trendObj.thickness : 0,
                            stroke: trendObj.borderColor,
                            'stroke-linecap': 'round',
                            'stroke-dasharray': trendObj.dashStyle
                        });
                }

                //if it has marker then add it
                if (trendObj.useMarker) {
                    trendObj.markerElement = marker = paper.polypath(
                        sides,
                        startX,
                        startY,
                        trendObj.markerRadius,
                        (-trendStartAngle + Math.PI) / deg2rad,
                        0,
                        elements.trendMarkerGroup
                    ).attr({
                        fill:  trendObj.markerColor,
                        'stroke-width': 1,
                        stroke: trendObj.markerBorderColor
                    });

                    if (trendObj.markerToolText !== '') {
                        trendObj.markerElement.tooltip(trendObj.markerToolText);
                    }
                }

                //draw the text if any
                if (trendObj.displayValue !== BLANKSTRING) {
                    textValue = (trendObj.endValue + trendObj.startValue) / 2;
                    trendEndAngle = startAngle + (((textValue - minValue) / valueRange) * angleRange);
                    cosTh = Math.cos(trendEndAngle);
                    sinTh = Math.sin(trendEndAngle);
                    if(trendObj.valueInside) {
                        textRadius = trendInnerRadius - 2 - trendValueDistance;
                        align = cosTh > limitingValue ? POSITION_RIGHT :
                            (cosTh < limitingNegValue ? POSITION_LEFT : POSITION_CENTER);
                    }
                    else {
                        textRadius = trendRadius + 2 + trendValueDistance;
                        align = cosTh > limitingValue ? POSITION_LEFT :
                            (cosTh < limitingNegValue ? POSITION_RIGHT : POSITION_CENTER);
                    }
                    startX = x + (textRadius * cosTh);
                    startY = y + (textRadius * sinTh);

                    style = trendObj.style;

                    trendObj.textElement =
                        paper.text(elements.trendMarkerGroup)
                        .attr({
                            x: startX,
                            y: startY,
                            text: trendObj.displayValue,
                            title: (trendObj.originalText || ''),
                            'text-anchor': textHAlign[trendObj.align || align],
                            'vertical-align': POSITION_TOP
                        })
                        .css(style);

                    //adjust with the bbox
                    bboxObj = trendObj.textElement.getBBox();
                    stHeight = bboxObj.height;
                    //set the text Y
                    if (cosTh > limitingValue || cosTh < limitingNegValue) {
                        startY += - (stHeight / 2) + (stHeight * 0.4 * sinTh * (trendObj.valueInside ? -1 : 1));
                    }
                    else {
                        if(trendObj.valueInside) {
                            startY += - (sinTh < 0 ? 0 : stHeight);
                        }
                        else {
                            startY += - (sinTh > 0 ? 0 : stHeight);
                        }
                    }

                    trendObj.textElement.attr({
                        y: startY
                    });
                }
            }
        },

        drawWidgetValue: function (dataArr, animation) {

            var renderer = this,
            data = dataArr,
            options = renderer.options,
            chartOptions = options.chart,
            scale = options.scale,
            drawOptions = options.series[0],
            paper = renderer.paper,
            elements = renderer.elements,
            x = Number(drawOptions.gaugeOriginX),
            y = Number(drawOptions.gaugeOriginY),
            startAngle = chartOptions.gaugeStartAngle,
            endAngle = chartOptions.gaugeEndAngle,
            showShadow = chartOptions.showShadow,
            showTooltip = (options.tooltip.enabled !== false),
            minValue = scale.min,
            maxValue = scale.max,
            pGroup = elements.pointGroup,
            valueRange = maxValue - minValue,
            angleRange = endAngle - startAngle,
            angleValueFactor = valueRange / angleRange,
            i = 0, point, radius, baseWidth, topWidth, rearExtension, baseWidthHF, topWidthHF,
            ln = data && data.length,
            rotation,
            graphic,
            prevData,
            attrFN = getAttrFunction(startAngle, endAngle),
            chartPosition = getPosition(renderer.container),
            getClickArcTangent = function (x, y, center, ref) {
                return mathATan2(center[1] - y + ref.top,
                    center[0] - x + ref.left);
            },
            dialDragStart = function (startX, startY) {
                // Record the angle of point of drag start with respect
                // to starting angle.
                renderer.rotationStartAngle = getClickArcTangent(startX, startY, [x, y], chartPosition);

                var chartObj = renderer.fusionCharts;
                prevData = chartObj.getDataJSON();
            },

            dialDragEnd = function () {
                var point = this,
                chartObj = renderer.fusionCharts,
                jsVars;

                jsVars = chartObj && chartObj.jsVars;
                jsVars && (jsVars._rtLastUpdatedData = chartObj.getDataJSON());

                global.raiseEvent('RealTimeUpdateComplete', {
                    data: '&value=' + point.updatedValStr,
                    updateObject: {values: [point.updatedValStr]},
                    prevData: prevData.values,
                    source: 'editMode',
                    url: null
                }, chartObj);

                try {
                    /* jshint camelcase: false*/
                    win.FC_ChartUpdated &&
                    win.FC_ChartUpdated(chartObj.id);
                    /* jshint camelcase: true*/
                }
                catch (err) {
                    setTimeout(function () {
                        throw (err);
                    }, 1);
                }
            },
            dialDragHandler = function (dx, dy, startX, startY) {

                var point = this,
                newAngle = getClickArcTangent(startX, startY, [x, y], chartPosition),
                startAngle = renderer.rotationStartAngle,
                angleDelta,
                newVal,
                values,
                i,
                len;

                if (newAngle < 0 && startAngle > 0) {
                    angleDelta = mathAbs(newAngle) - renderer.rotationStartAngle;
                } else if (newAngle > 0 && startAngle < 0) {
                    angleDelta = mathAbs(renderer.rotationStartAngle) - newAngle;
                } else {
                    angleDelta = renderer.rotationStartAngle - newAngle;
                }
                newVal = point.y - (angleDelta * angleValueFactor);
                values = [];
                i = 0;
                len = point.index;

                if (newVal < scale.min) {
                    newVal = scale.min;
                } else if (newVal > scale.max){
                    newVal = scale.max;
                }

                for(;i < len; i += 1) {
                    values.push('');
                }
                values.push(newVal);

                if (newVal !== point.value && renderer.realtimeUpdate({
                    values: values
                }, {duration: 0})) {
                    point.updatedValStr = values.join('|');
                    renderer.rotationStartAngle = newAngle;
                }
            },
            link,
            eventArgs,
            rolloverProperties,
            pathComand,
            hoverRadius,
            baseHoverWidth,
            baseHoverWidthHF,
            topHoverWidth,
            topHoverWidthHF,
            rearHoverExtension,
            clickHandler,
            hoverRollOver,
            hoverRollOut,
            angleValue;


            if (renderer.dataById === undefined) {
                renderer.dataById = {};
            }

            if (!elements.pointers) {
                elements.pointers = [];
            }

            clickHandler = function (data) {
                var ele = this;

                plotEventHandler.call(ele, renderer, data);
            };

            hoverRollOver = function (data) {
                var ele = this,
                transStr,
                rolloverProperties = ele.data('rolloverProperties');
                plotEventHandler.call(ele, renderer, data, ROLLOVER);
                if (rolloverProperties.enabled) {
                    transStr = ele.attr('transform');
                    ele.attr('transform', '');
                    ele.attr(rolloverProperties.hoverAttr);
                    ele.attr('transform', transStr);

                }
            };

            hoverRollOut = function (data) {
                var ele = this,
                        transStr,
                rolloverProperties = ele.data('rolloverProperties');
                plotEventHandler.call(ele, renderer, data, ROLLOUT);
                if (rolloverProperties.enabled) {
                    transStr = ele.attr('transform');
                    ele.attr('transform', '');
                    ele.attr(rolloverProperties.outAttr);
                    ele.attr('transform', transStr);
                }
            };

            for (; i < ln; i += 1) {
                point = data[i];
                rolloverProperties = point.rolloverProperties || {};
                //for null data dial will stay at min position
                if (!defined(point.y)) {
                    point.y = minValue;
                    if (!defined(point.toolText)) {
                        point.toolText = minValue;
                    }
                    if (point.displayValue === ' ') {
                        point.displayValue = minValue;
                    }
                }

                if (point.id !== undefined) {
                    renderer.dataById[point.id] = {
                        index: i,
                        point: point
                    };
                }

                point.index = i;
                radius = pluckNumber(point.radius, (Number(drawOptions.gaugeOuterRadius) +
                    Number(drawOptions.gaugeInnerRadius)) / 2);
                baseWidth = point.baseWidth;
                baseWidthHF = baseWidth / 2;
                topWidth = point.topWidth;
                topWidthHF = topWidth / 2;
                rearExtension = point.rearExtension;

                //set the tooltip pos
                point.tooltipPos = [x, y];
                if (!elements.pointers[i]) {
                    link = point.editMode ? undefined : point.link;
                    pathComand = [M, radius, -topWidthHF, L, radius, topWidthHF, -rearExtension,
                        baseWidthHF, -rearExtension, -baseWidthHF, Z];
                    if (rolloverProperties.hasHoverSizeChange) {
                        rolloverProperties.outAttr.path = pathComand;
                        hoverRadius = pluckNumber(rolloverProperties.hoverRadius, radius);
                        baseHoverWidth = rolloverProperties.baseHoverWidth;
                        baseHoverWidthHF = baseHoverWidth / 2;
                        topHoverWidth = rolloverProperties.topHoverWidth;
                        topHoverWidthHF = topHoverWidth / 2;
                        rearHoverExtension = rolloverProperties.rearHoverExtension;
                        rolloverProperties.hoverAttr.path = [M, hoverRadius, -topHoverWidthHF, L,
                            hoverRadius, topHoverWidthHF, -rearHoverExtension, baseHoverWidthHF,
                            -rearHoverExtension, -baseHoverWidthHF, Z];
                    }

                    eventArgs = {
                        link: link,
                        value: point.y,
                        displayValue: point.displayValue,
                        toolText: point.toolText
                    };

                    point.graphic = graphic = elements.pointers[i] = paper.path(pathComand, pGroup)
                    .attr({
                        fill: point.color,
                        stroke: point.borderColor,
                        ishot: true,
                        'stroke-width': point.borderThickness
                    })
                    .click(clickHandler)
                    .hover(hoverRollOver, hoverRollOut)
                    .data('eventArgs', eventArgs)
                    .data('rolloverProperties', rolloverProperties);

                    if (baseWidth || topWidth || point.borderThickness) {
                        point.graphic.shadow({apply: showShadow});
                    }

                    graphic._attr = graphic.attr;
                    graphic.attr = attrFN;
                    graphic._Attr = {
                        tooltipPos: point.tooltipPos,
                        cx: x,
                        cy: y,
                        toolTipRadius: radius - rearExtension,
                        color: point.color
                    };

                    rotation = (startAngle / deg2rad);
                    graphic.attr({
                        angle: rotation
                    });

                    if (point.editMode) {
                        point.index = i;
                        point.graphic.css({
                            cursor: 'pointer',
                            '_cursor': 'hand'
                        })
                        .attr({
                            ishot: true
                        });

                        point.graphic.drag(dialDragHandler, dialDragStart, dialDragEnd, point, point, point);
                    }
                }
                else {
                    graphic = elements.pointers[i];
                }
                //replace attr function
                // Set the dial to the startAngle

                // Rotate the dial as per the angle
                if (point.y >= minValue && point.y <= maxValue) {
                    angleValue = ((point.y - minValue) / valueRange) * angleRange;
                    rotation = (startAngle + angleValue) / deg2rad;
                    graphic
                        .attr({
                            angle: rotation
                        }, null, animation);

                    showTooltip && graphic.tooltip(point.toolText);
                }
            }
        },

        drawWidgetLabel: function (dataArr) {
            var renderer = this,
            paper = renderer.paper,
            layers = renderer.layers,
            dataLabelsGroup = layers.datalabels,
            options = renderer.options,
            drawOptions = options.series[0],
            labelAlign = POSITION_CENTER,
            style = options.plotOptions.series.dataLabels.style,
            pivotRadius = drawOptions.pivotRadius,
            lineHeight = pluckNumber(parseInt(style.lineHeight, 10), 12),
            isBelow = drawOptions.valueBelowPivot,
            x = drawOptions.gaugeOriginX,
            y = drawOptions.gaugeOriginY,
            css = {
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                lineHeight: style.lineHeight,
                fontWeight: style.fontWeight,
                fontStyle: style.fontStyle
            },
            displayValue,
            labelX,
            labelY,
            lastY = y + (isBelow ? (lineHeight / 2) + pivotRadius + 2 : -(lineHeight / 2) -
                pivotRadius - 2);//2 pix gutter

            // create a separate group for the data labels to avoid rotation
            if (!dataLabelsGroup) {
                dataLabelsGroup = layers.datalabels = paper.group('datalabels').insertAfter(layers.dataset);
            }

            each(dataArr, function (point, i) {
                displayValue = point.displayValue,
                labelY = point.valueY;
                labelX = pluckNumber(point.valueX, x);
                if (!defined(labelY)) {
                    labelY = isBelow ? lastY + (lineHeight * i) : lastY - (lineHeight * i);
                }

                if (defined(displayValue) && displayValue !== BLANK) {
                    if (!point.dataLabel) {
                        point.dataLabel = paper.text(dataLabelsGroup)
                        .attr({
                            x: labelX,
                            y: labelY,
                            text: displayValue,
                            'text-anchor': textHAlign[labelAlign],
                            title: (point.originalText || ''),
                            fill: style.color,
                            'text-bound': [style.backgroundColor, style.borderColor,
                                style.borderThickness, style.borderPadding,
                                style.borderRadius, style.borderDash]
                        })
                        .css(css);
                    }
                    else {
                        point.dataLabel.attr({
                            text: displayValue,
                            title: (point.originalText || '')
                        });
                    }
                }
            });
        },

        drawScale: function () {

            var renderer = this,
            options = renderer.options,
            chartOptions = options.chart,
            scale = options.scale,
            paper = renderer.paper,
            elements = renderer.elements,
            drawOptions = options.series[0],
            x = Number(drawOptions.gaugeOriginX),
            y = Number(drawOptions.gaugeOriginY),
            startAngle = chartOptions.gaugeStartAngle,
            endAngle = chartOptions.gaugeEndAngle,
            minValue = scale.min,
            maxValue = scale.max,
            innerRadius = Number(drawOptions.gaugeInnerRadius),
            outerRadius = Number(drawOptions.gaugeOuterRadius),
            valueRange = maxValue - minValue,
            angleRange = endAngle - startAngle,
            i = 0,
            majorTM = scale.majorTM,
            minorTM = scale.minorTM,
            length,
            TMObj,
            tickMarkGroup = elements.tickMarkGroup,
            tmX, tmY, tmXs, tmYs, label, align = POSITION_CENTER,
            angle, cos = Math.cos, sin = Math.sin,
            minorTMHeight = Number(scale.minorTMHeight),
            majorTMHeight = Number(scale.majorTMHeight),
            placeTicksInside = scale.placeTicksInside,
            placeValuesInside = scale.placeValuesInside,
            tickValueDistance = scale.tickValueDistance,
            tmRadius, tmRadiusMi, tmRadiusMa, valueR, value,
            tickLabelsStyle,
            cosThita, sinThita,
            limitStyle = scale.limitValues.style,
            tickStyle = scale.tickValues.style,
            limitBaseLineHeight = pluckNumber(parseInt(limitStyle.lineHeight, 10), 12) * 0.75,
            tickBaseLineHeight = pluckNumber(parseInt(tickStyle.lineHeight, 10), 12) * 0.75;

            if (placeTicksInside) {
                tmRadius = innerRadius;
                tmRadiusMi = tmRadius + minorTMHeight;
                tmRadiusMa = tmRadius + majorTMHeight;
            }
            else {
                tmRadius = outerRadius;
                tmRadiusMi = tmRadius - minorTMHeight;
                tmRadiusMa = tmRadius - majorTMHeight;
            }

            if (placeValuesInside) {
                valueR = innerRadius - tickValueDistance;
            }
            else {
                valueR = outerRadius + tickValueDistance;
            }


            if (!elements.majorTM) {
                elements.majorTM = [];
            }
            if (!elements.tmLabel) {
                elements.tmLabel = [];
            }
            for (i = 0, length = majorTM.length; i < length; i += 1) {
                TMObj = majorTM[i];
                value = TMObj.value,
                label = TMObj.displayValue;
                //tmY = tickY + (reverseScale ? (minValue + value) : (maxValue - value)) * ratio;
                angle = ((value - minValue) * angleRange / valueRange) + startAngle;
                cosThita = cos(angle);
                sinThita = sin(angle);
                tmX = x + (tmRadius * cosThita);
                tmY = y + (tmRadius * sinThita);
                tmXs = x + (tmRadiusMa * cosThita);
                tmYs = y + (tmRadiusMa * sinThita);

                elements.majorTM[i] = paper.path([M, tmX, tmY, L, tmXs, tmYs], tickMarkGroup)
                .attr({
                    stroke: convertColor(scale.majorTMColor, scale.majorTMAlpha),
                    'stroke-width': scale.majorTMThickness,
                    'stroke-linecap': 'round'
                });

                // Render Tick-Mark Values
                if (label !== '') {
                    if (i === 0 || i === length -1){
                        tickLabelsStyle = limitStyle;
                        tmY = y + (valueR * sinThita) + (TMObj.y || 0) - limitBaseLineHeight;
                    }
                    else{
                        tickLabelsStyle = tickStyle;
                        tmY = y + (valueR * sinThita) + (TMObj.y || 0) - tickBaseLineHeight;
                    }
                    tmX = x + (valueR * cosThita) + (TMObj.x || 0);
                    // Render tickMark label text
                    elements.tmLabel[i] = paper.text(tmX, tmY, label, tickMarkGroup)
                    .attr({
                        'text-anchor': textHAlign[TMObj.align || align],
                        title: (TMObj.originalText || ''),
                        'vertical-align': POSITION_TOP
                    })
                    .css(tickLabelsStyle);
                }
            }

            if (!elements.minorTM) {
                elements.minorTM = [];
            }
            for (i = 0, length = minorTM.length; i < length; i += 1) {
                value = minorTM[i];
                angle = ((value - minValue) * angleRange / valueRange) + startAngle;
                tmX = x + (tmRadius * cos(angle));
                tmY = y + (tmRadius * sin(angle));
                tmXs = x + (tmRadiusMi * cos(angle));
                tmYs = y + (tmRadiusMi * sin(angle));

                elements.minorTM[i] = paper.path([M, tmX, tmY, L, tmXs, tmYs], tickMarkGroup)
                .attr({
                    stroke: convertColor(scale.minorTMColor, scale.minorTMAlpha),
                    'stroke-width': scale.minorTMThickness,
                    'stroke-linecap': 'round'
                });
            }
        },

        realtimeUpdate: function (updateObj, animation) {
            if (updateObj === this.lastUpdatedObj) {
                return false;
            }

            var renderer = this,
                options = renderer.options,
                HCConfig = options[CONFIGKEY],
                series = options.series,
                numberFormatter = renderer.numberFormatter,
                dataArr = (series && series[0] && series[0].data),
                values = updateObj.values || [],
                labels = updateObj.labels || [],
                toolTexts = updateObj.toolTexts || [],
                showLabels = updateObj.showLabels || [],
                i = (dataArr && dataArr.length) || 0,
                dataObj,
                data,
                tooltext,
                formatedValue = null,
                newData = [],
                pointObj;
            //use the realtime animation value or the default series animation value
            animation = animation || (options.plotOptions.series.animation);
            if (i) {
                while (i--) {
                    pointObj = {};
                    dataObj = {};
                    data = dataArr[i];
                    if (values[i] !== undefined && values[i] !== '') {
                        dataObj.value = pointObj.value = values[i];
                        formatedValue = pointObj.displayvalue =
                            pointObj.tooltext = numberFormatter.dataLabels(pointObj.value);
                        pointObj.hasNewData = true;
                    }
                    else {
                        pointObj.value = data.y;
                    }

                    if (labels[i]) {
                        pointObj.displayvalue = labels[i];
                        pointObj.hasNewData = true;
                    }

                    if (showLabels[i] == '0') {
                        pointObj.displayvalue = BLANKSTRING;
                        pointObj.hasNewData = true;
                    }
                    tooltext = getValidValue(parseUnsafeString(pluck(data._tooltext, HCConfig.tooltext)));
                    if (toolTexts[i]) {
                        tooltext = getValidValue(parseUnsafeString(toolTexts[i]));
                        pointObj.hasNewData = true;
                    }

                    if (pointObj.hasNewData) {
                        newData[i] = pointObj;
                        extend2(data, {
                            y: pointObj.value,
                            displayValue: ((data.displayValue || showLabels[i] === '1') ?
                            pointObj.displayvalue : BLANKSTRING),
                            toolText: tooltext !== undefined ? parseTooltext(tooltext, [1,2], {
                                formattedValue: formatedValue
                            }, dataObj) : formatedValue
                        });
                    }
                }

                if (newData.length) {
                    this.lastUpdatedObj = updateObj;
                    this.drawWidgetValue(dataArr, animation);
                    this.drawWidgetLabel(dataArr, animation);
                }

                return Boolean(newData.length);

            }
        }

    }, renderer['renderer.widgetbase']);

    renderer('renderer.funnel', {

        type: 'funnel',

        pyramidFunnelShape: (function () {
            //list of attr that will handled here
            var attrList = {
                y : true,
                R1 : true,
                R2 : true,
                h : true,
                r3dFactor : true,
                color : true,
                opacity : true,
                fill : true,
                stroke : true,
                strokeColor: true,
                strokeAlpha: true,
                'stroke-width' : true
            },
            //FIX for #FWXT-600
            //for zero radius calcPoints return erroneous value
            minRadius = 0.01,

            getArcPath = function (cX, cY, startX, startY, endX, endY, rX, rY, isClockWise, isLargeArc) {
                return [A, rX, rY, 0, isLargeArc, isClockWise, endX, endY];

            },

            /**
            * calcPoints method calculates and returns the
            * coordinates of four points of common tangency
            * between the upper and lower ellipses.
            * @param    a1          semi-major axis length of the upper ellipse
            * @param    b1          semi-minor axis length of the upper ellipse
            * @param    h1          height of upper ellipse center
            * @param    a2          semi-major axis length of the lower ellipse
            * @param    b2          semi-minor axis length of the lower ellipse
            * @param    h2          height of lower ellipse center
            * @returns              object holding point instances corresponding
            *                       to the 4 points of tangencies.
            */
            calcPoints = function (a1, b1, h1, a2, b2, h2) {
               // calcuating parameters of formula
                var alpha = mathPow(a2, 2) - mathPow(a1, 2),
                    beta = -2 * (mathPow(a2, 2) * h1 - mathPow(a1, 2) * h2),
                    gamma = mathPow(a1 * b2, 2) + mathPow(a2 * h1, 2) -
                                        mathPow(a2 * b1, 2) - mathPow(a1 * h2, 2),
                    k = mathSqrt(mathPow(beta, 2) - 4 * alpha * gamma),
                    // getting the 2 y-intercepts for there are 2 pairs of tangents
                    c1 = (-beta + k) / (2 * alpha),
                    c2 = (-beta - k) / (2 * alpha),
                    oneHND = 100,
                    objPoints,
                    c,
                    m1,
                    m2,
                    p1,
                    p2,
                    p3,
                    p4,
                    i;

               // but we need only one pair and hence one value of y-intercept
                if (c1 < h2 && c1 > h1) {
                    c = c2;
                }
                else if (c2 < h2 && c2 > h1) {
                    c = c1;
                }
                // getting the slopes of the 2 tangents of the selected pair
                m1 = mathSqrt((mathPow(c - h1, 2) - mathPow(b1, 2)) / mathPow(a1, 2));
                m2 = -m1;

               // getting the 4 points of tangency
               // right sided points
               //upper
                p1 = {
                    x : mathRound((mathPow(a1, 2) * m1 / (c - h1)) * oneHND) / oneHND,
                    y : mathRound(((mathPow(b1, 2) / (c - h1)) + h1) * oneHND) / oneHND
                };
               //lower
                p2 = {
                    x : mathRound((mathPow(a2, 2) * m1 / (c - h2)) * oneHND) / oneHND,
                    y : mathRound(((mathPow(b2, 2) / (c - h2)) + h2) * oneHND) / oneHND
                };
               // left sided points
               //upper
                p3 = {
                    x : mathRound((mathPow(a1, 2) * m2 / (c - h1)) * oneHND) / oneHND,
                    y : mathRound(((mathPow(b1, 2) / (c - h1)) + h1) * oneHND) / oneHND
                };
               //lower
                p4 = {
                    x : mathRound((mathPow(a2, 2) * m2 / (c - h2)) * oneHND) / oneHND,
                    y : mathRound(((mathPow(b2, 2) / (c - h2)) + h2) * oneHND) / oneHND
                };
               // storing in object to be passed as a collection
                objPoints = {
                    topLeft: p3,
                    bottomLeft: p4,
                    topRight: p1,
                    bottomRight: p2
                };
               // checking for invalid situations
                for (i in objPoints) {
                    if (isNaN(objPoints[i].x) || isNaN(objPoints[i].y)) {
                        // The funnel is extremely thin and points of tangencies
                        // coincide with ellipse ends
                        if (i === 'topLeft' || i === 'bottomLeft') {
                            objPoints[i].x = -a1;
                        }
                        else {
                            objPoints[i].x = a1;
                        }
                        objPoints[i].y = (i === 'bottomRight' || i === 'bottomLeft') ? h2 : h1;
                    }
                }
                // object returned
                return objPoints;
            },

            getFunnel3DShapeArgs = function (x, y, R1, R2, h, r3dFactor, isHollow) {
                var y2 = y + h,
                R3 = R1 * r3dFactor, R4 = R2 * r3dFactor, shapearge,
                objPoints = calcPoints(R1, R3, y, R2, R4, y2),
                topLeft = objPoints.topLeft,
                bottomLeft = objPoints.bottomLeft,
                topRight = objPoints.topRight,
                bottomRight = objPoints.bottomRight,
                X1 = x + topLeft.x, X2 = x + topRight.x, X3 = x + bottomLeft.x, X4 = x + bottomRight.x,
                y3 = topLeft.y, y4 = bottomLeft.y,

                arc1 = getArcPath(x, y, X1, y3, X2, y3, R1, R3, 0, 0),
                arc2 = getArcPath(x, y, X1, y3, X2, y3, R1, R3, 1, 1),
                arc3 = getArcPath(x, y2, X4, y4, X3, y4, R2, R4, 1, 0),
                arc4 = getArcPath(x, y2, X4, y4, X3, y4, R2, R4, 0, 1);

                shapearge =  {
                    front : [M, X1, y3].concat(arc1, [L, X4, y4], arc3, [Z]),

                    back : [M, X1, y3].concat(arc2, [L, X4, y4], arc4, [Z]),
                    silhuette  : [M, X1, y3].concat(arc2, [L, X4, y4], arc3, [Z])
                };
                if (!isHollow) {
                    shapearge.top = [M, X1, y3].concat(arc1, [L, X2, y3],
                        getArcPath(x, y, X2, y3, X1, y3, R1, R3, 0, 1), [Z]);
                }

                return shapearge;
            },
            getPyramid3DShapeArgs = function(x, y, R1, R2, h, r3dFactor, is2D, renderer, isFunnel, isHollow) {
                if (isObject(x)) {
                    y = x.y;
                    R1 = x.R1;
                    R2 = x.R2;
                    h = x.h;
                    r3dFactor = x.r3dFactor;
                    is2D = x.is2D;
                    isHollow = x.isHollow;
                    isFunnel = x.isFunnel;
                    renderer = x.renderer;
                    x = x.x;
                }
                var X1 = x - R1, X2 = x + R1, X3 = x - R2, X4 = x + R2, y2 = y + h, shapeArgs,
                    R3,
                    R4,
                    lightLength,
                    lightLengthH,
                    lightLengthH1,
                    lightWidth;
                if (is2D) {
                    shapeArgs = {
                        silhuette  : [M, X1, y, L, X2, y, X4, y2, X3, y2, Z]
                    };
                    if(!isFunnel){
                        shapeArgs.lighterHalf = [M, X1, y, L, x, y, x, y2, X3, y2, Z];
                        shapeArgs.darkerHalf = [M, x, y, L, X2, y, X4, y2, x, y2, Z];
                    }
                }
                else if (isFunnel){
                    shapeArgs = getFunnel3DShapeArgs(x, y, R1 || minRadius, R2 ||
                        minRadius, h, r3dFactor, isHollow, renderer);
                }
                else {
                    R3 = R1 * r3dFactor;
                    R4 = R2 * r3dFactor;
                    lightLength = mathMin(5, R1);
                    lightLengthH = mathMin(2, 2 * R3);
                    lightLengthH1 = mathMin(2, lightLengthH);
                    lightWidth = lightLengthH1 / r3dFactor;
                    shapeArgs = {
                        top : [M, X1, y, L, x, y + R3, X2, y, x, y - R3,Z],
                        front : [M, X1, y, L, x, y + R3, X2, y, X4, y2, x, y2 + R4,
                        X3, y2, Z],
                        topLight : [M, X1, y + 0.5, L, x, y + R3 + 0.5, x, y + R3 - lightLengthH,
                            X1 + lightWidth, y,  Z],// x, y + R3 - lightLengthH, Z],
                        topLight1 : [M, X2, y + 0.5, L, x, y + R3 + 0.5, x, y + R3 - lightLengthH1,
                            X2 - lightWidth, y,  Z],// x, y + R3 - lightLengthH, Z],
                        silhuette  : [M, X1, y, L, x, y - R3, X2, y, X4, y2, x, y2 + R4,
                            X3, y2, Z],
                        centerLight : [M, x, y + R3, L, x, y2 + R4, x - 5, y2 + R4,
                        x - lightLength, y + R3, Z],
                        centerLight1 : [M, x, y + R3, L, x, y2 + R4, x + 5, y2 + R4,
                        x + lightLength, y + R3, Z]
                    };
                }

                return shapeArgs;
            },
            attr = function (hash, val) {
                var key,
                value,
                element = this,
                color,
                alpha,
                colorObject,
                shapeChanged = false,
                colorChanged = false,
                lightColor,
                lightColor1,
                darkColor,
                attr3D = this._3dAttr,
                shapeArgs,
                colorDark,
                colorLight,
                zero100STR,
                lightAlphaSTR,
                lightShade,
                slantAngle,
                lightShadeStop;



                // single key-value pair
                if (isString(hash) && defined(val)) {
                    key = hash;
                    hash = {};
                    hash[key] = val;
                }

                // used as a getter: first argument is a string, second is undefined
                if (isString(hash)) {

                    //if belongs from the list then handle here
                    if (attrList[hash]) {
                        element = this._3dAttr[hash];
                    }
                    else {//else leve for the original attr
                        element = this._attr(hash);
                    }

                // setter
                }
                else {
                    for (key in hash) {
                        value = hash[key];

                        //if belongs from the list then handle here
                        if (attrList[key]) {
                            //store the att in attr3D for further use
                            attr3D[key] = value;
                            //if it is 'fill' or 'lighting3D' the redefine the colors for all the 3 elements
                            if (key === 'fill') {
                                if (value && value.linearGradient && value.stops && value.stops[0]) {
                                    value = value.stops[0][1];
                                }

                                if (startsRGBA.test(value)) {
                                    colorObject = new Color(value);
                                    color = colorObject.get('hex');
                                    alpha = colorObject.get('a') * 100;
                                }
                                else if (value && value.FCcolor) {
                                    color = value.FCcolor.color.split(COMMASTRING)[0];
                                    alpha = value.FCcolor.opacity.split(COMMASTRING)[0];
                                }
                                else if (HEXCODE.test(value)) {
                                    color = value.replace(dropHash, HASHSTRING);
                                    alpha = pluckNumber(attr3D.opacity, 100);
                                }
                                attr3D.color = color;
                                attr3D.opacity = alpha;
                                colorChanged = true;
                            }
                            else if (key === 'color' || key === 'opacity') {
                                attr3D.fill = toRaphaelColor(convertColor(attr3D.color,
                                    pluckNumber(attr3D.opacity, 100)));
                                colorChanged = true;
                            }
                            else if (key === 'stroke' || key === 'strokeColor' || key === 'strokeAlpha') {
                                if (attr3D.is2D) {//stroke is only applicable on 2d shape
                                    if (key === 'stroke') {
                                        if (value && value.linearGradient && value.stops && value.stops[0]) {
                                            value = value.stops[0][1];
                                        }

                                        if (startsRGBA.test(value)) {
                                            colorObject = new Color(value);
                                            color = colorObject.get('hex');
                                            alpha = colorObject.get('a') * 100;
                                        }
                                        else if (value && value.FCcolor) {
                                            color = value.FCcolor.color.split(COMMASTRING)[0];
                                            alpha = value.FCcolor.opacity.split(COMMASTRING)[0];
                                        }
                                        else if (HEXCODE.test(value)) {
                                            color = value.replace(dropHash, HASHSTRING);
                                            alpha = pluckNumber(attr3D.opacity, 100);
                                        }
                                        attr3D.strokeColor = color;
                                        attr3D.strokeAlpha = alpha;
                                    }
                                    else {
                                        attr3D.stroke = convertColor(attr3D.strokeColor,
                                            pluckNumber(attr3D.strokeAlpha, 100));
                                    }
                                    if (attr3D.isFunnel) {
                                        this.funnel2D.attr('stroke', attr3D.stroke);
                                    }
                                    else {
                                        this.borderElement.attr('stroke', attr3D.stroke);
                                    }
                                }
                            }
                            else  if (key === 'stroke-width'){
                                if (attr3D.is2D) {//stroke is only applicable on 2d shape
                                    if (attr3D.isFunnel) {
                                        this.funnel2D.attr(key, value);
                                    }
                                    else {
                                        this.borderElement.attr(key, value);
                                    }
                                }
                            }
                            else {
                                shapeChanged = true;
                            }
                        }
                        else {//else leave for the original attr
                            this._attr(key, value);
                        }
                    }


                    if (attr3D.is2D) {
                        if (shapeChanged) {
                            shapeArgs = getPyramid3DShapeArgs(attr3D.x, attr3D.y,
                                attr3D.R1, attr3D.R2, attr3D.h, attr3D.r3dFactor, attr3D.is2D);
                            element.shadowElement.attr({
                                path: shapeArgs.silhuette
                            });
                            if (attr3D.isFunnel) {
                                element.funnel2D.attr({
                                    path: shapeArgs.silhuette
                                });
                            }
                            else {
                                element.lighterHalf.attr({
                                    path: shapeArgs.lighterHalf
                                });
                                element.darkerHalf.attr({
                                    path: shapeArgs.darkerHalf
                                });
                                element.borderElement.attr({
                                    path: shapeArgs.silhuette
                                });
                            }
                        }
                        //if color change requared
                        if (colorChanged) {
                            if (attr3D.isFunnel) {
                                element.funnel2D.attr('fill', toRaphaelColor(convertColor(attr3D.color,
                                    pluckNumber(attr3D.opacity, 100))));
                            }
                            else {
                                colorDark = getDarkColor(attr3D.color, 80);
                                colorLight = getLightColor(attr3D.color, 80);
                                element.lighterHalf.attr('fill', toRaphaelColor(convertColor(colorLight,
                                    pluckNumber(attr3D.opacity, 100))));
                                element.darkerHalf.attr('fill', toRaphaelColor(convertColor(colorDark,
                                    pluckNumber(attr3D.opacity, 100))));
                            }
                        }
                    }
                    else {
                        //if shape changed requared
                        if (shapeChanged) {
                            shapeArgs = getPyramid3DShapeArgs(attr3D.x, attr3D.y, attr3D.R1, attr3D.R2,
                                attr3D.h, attr3D.r3dFactor, attr3D.is2D);
                            element.shadowElement.attr('path', shapeArgs.silhuette);
                            if (attr3D.isFunnel) {
                                element.front.attr('path', shapeArgs.front);
                                element.back.attr('path', shapeArgs.back);
                                if (element.toptop && shapeArgs.top) {
                                    element.toptop.attr('path', shapeArgs.top);
                                }
                            }
                            else {
                                element.front.attr('path', shapeArgs.front);
                                element.toptop.attr('path', shapeArgs.top);
                                element.topLight.attr('path', shapeArgs.topLight);
                                element.topLight1.attr('path', shapeArgs.topLight1);
                                element.centerLight.attr('path', shapeArgs.centerLight);
                                element.centerLight1.attr('path', shapeArgs.centerLight1);
                            }
                        }
                        //if color change requared
                        if (colorChanged) {
                            color = attr3D.color;
                            alpha = attr3D.opacity;
                            if (attr3D.isFunnel) {
                                lightColor = getLightColor(color, 60);
                                darkColor = getDarkColor(color, 60);
                                element.back.attr('fill', toRaphaelColor({
                                    FCcolor : {
                                        color : darkColor + COMMASTRING + lightColor + COMMASTRING + color,
                                        alpha : alpha + COMMASTRING + alpha + COMMASTRING + alpha,
                                        ratio : '0,60,40',
                                        angle : 0
                                    }
                                }));
                                element.front.attr('fill', toRaphaelColor({
                                    FCcolor : {
                                        color : color + COMMASTRING + lightColor + COMMASTRING + darkColor,
                                        alpha : alpha + COMMASTRING + alpha + COMMASTRING + alpha,
                                        ratio : '0,40,60',
                                        angle : 0
                                    }
                                }));
                                if (element.toptop) {
                                    element.toptop.attr('fill', toRaphaelColor({
                                        FCcolor : {
                                            color : lightColor + COMMASTRING + darkColor,
                                            alpha : alpha + COMMASTRING + alpha,
                                            ratio : '0,100',
                                            angle : -65
                                        }
                                    }));
                                }
                            }
                            else {
                                lightColor = getLightColor(color, 80);
                                lightColor1 = getLightColor(color, 70);
                                darkColor = getDarkColor(color, 80);
                                zero100STR = '0,100';
                                lightAlphaSTR = '0,' + alpha;
                                lightShade = color + COMMASTRING + lightColor1;
                                slantAngle = -45;
                                lightShadeStop = (5 / (attr3D.R1 * attr3D.r3dFactor)) * 100;
                                //slantAngle = - math.atan(1 / attr3D.r3dFactor) / deg2rad

                                element.centerLight.attr('fill', toRaphaelColor({
                                    FCcolor : {
                                        color : lightShade,
                                        alpha : lightAlphaSTR,
                                        ratio : zero100STR,
                                        angle : 0
                                    }
                                }));
                                element.centerLight1.attr('fill', toRaphaelColor({
                                    FCcolor : {
                                        color : lightShade,
                                        alpha : lightAlphaSTR,
                                        ratio : zero100STR,
                                        angle : 180
                                    }
                                }));
                                element.topLight.attr('fill', toRaphaelColor({
                                    FCcolor : {
                                        color : lightColor1 + COMMASTRING + lightColor1 + COMMASTRING +
                                            color + COMMASTRING + color,
                                        alpha : alpha + COMMASTRING + alpha + COMMASTRING + 0 + COMMASTRING + 0,
                                        ratio : '0,50,' + lightShadeStop + COMMASTRING + (50 - lightShadeStop),
                                        angle : slantAngle
                                    }
                                }));
                                element.topLight1.attr('fill', toRaphaelColor({
                                    FCcolor : {
                                        color : lightColor1 + COMMASTRING + color + COMMASTRING + darkColor,
                                        alpha : alpha + COMMASTRING + alpha + COMMASTRING + alpha,
                                        ratio : '0,50,50',
                                        angle : 0
                                    }
                                }));
                                element.front.attr('fill', toRaphaelColor({
                                    FCcolor : {
                                        color : color + COMMASTRING + color + COMMASTRING +
                                        darkColor + COMMASTRING + darkColor,
                                        alpha : alpha + COMMASTRING + alpha + COMMASTRING + alpha + COMMASTRING + alpha,
                                        ratio : '0,50,0,50',
                                        angle : 0
                                    }
                                }));
                                element.toptop.attr('fill', toRaphaelColor({
                                    FCcolor : {
                                        color : lightColor + COMMASTRING + color + COMMASTRING +
                                            darkColor + COMMASTRING + darkColor,
                                        alpha : alpha + COMMASTRING + alpha + COMMASTRING + alpha + COMMASTRING + alpha,
                                        ratio : '0,25,30,45',
                                        angle : slantAngle
                                    }
                                }));
                            }
                        }
                    }
                }
                return element;
            },

            shadow = function () {
                var silhuette = this.shadowElement;
                if (shadow) {
                    silhuette.shadow.apply(silhuette, arguments);
                }
            };

            return function (x, y, R1, R2, h, r3dFactor, gStr, is2D, renderer, isFunnel, isHollow) {
                var chart = this,
                    graphicsGroup = chart.layers.dataset,
                    _3dAttr,
                    Shapeargs,
                    rect3D;

                if (isObject(x)) {
                    y = x.y;
                    R1 = x.R1;
                    R2 = x.R2;
                    h = x.h;
                    r3dFactor = x.r3dFactor;
                    gStr = x.gStr;
                    is2D = x.is2D;
                    renderer = x.renderer;
                    isHollow = x.isHollow;
                    isFunnel = x.isFunnel;
                    x = x.x;
                }
                r3dFactor = pluckNumber(r3dFactor, 0.15);
                _3dAttr = {
                    x : x,
                    y : y,
                    R1 : R1,
                    R2 : R2,
                    h : h,
                    r3dFactor : r3dFactor,
                    is2D : is2D,
                    isHollow : isHollow,
                    isFunnel : isFunnel,
                    renderer : renderer
                };
                Shapeargs = getPyramid3DShapeArgs(_3dAttr);

                rect3D = renderer.group(gStr, graphicsGroup);


                rect3D.Shapeargs = Shapeargs;

                rect3D.shadowElement = renderer.path(Shapeargs.silhuette, rect3D)
                .attr({
                    fill : TRACKER_FILL,
                    stroke: 'none'
                });

                //modify the attr function of the group so that it can handle pyramid attrs
                //store the old function
                rect3D._attr = rect3D.attr;
                rect3D.attr = attr;

                // Replace the shadow function with a modified version.
                rect3D.shadow = shadow;

                //store the 3d attr(requared in new attr function to change any related
                //                  attr modiffiaction)
                rect3D._3dAttr = _3dAttr;


                //add the new attr function
                if (isFunnel) {
                    //if the drawing is a 2d drawing
                    if (is2D) {
                        rect3D.funnel2D = renderer.path(Shapeargs.silhuette, rect3D);
                    }
                    else {

                        rect3D.back = renderer.path(Shapeargs.back, rect3D)
                        .attr({
                            'stroke-width' : 0,
                            stroke: 'none'
                        });
                        rect3D.front = renderer.path(Shapeargs.front, rect3D)
                        .attr({
                            'stroke-width' : 0,
                            stroke: 'none'
                        });
                        if (Shapeargs.top) {//not hollow
                            rect3D.toptop = renderer.path(Shapeargs.top, rect3D)
                            .attr({
                                'stroke-width' : 0,
                                stroke: 'none'
                            });
                        }
                    }
                }
                else {
                    //if the drawing is a 2d drawing
                    if (is2D) {
                        rect3D.lighterHalf = renderer.path(Shapeargs.lighterHalf, rect3D)
                        .attr({
                            'stroke-width' : 0
                        });
                        rect3D.darkerHalf = renderer.path(Shapeargs.darkerHalf, rect3D)
                        .attr({
                            'stroke-width' : 0
                        });
                        rect3D.borderElement = renderer.path(Shapeargs.silhuette, rect3D)
                        .attr({
                            fill : TRACKER_FILL,
                            stroke: 'none'
                        });
                    }
                    else {//else it should be 3d
                        rect3D.front = renderer.path(Shapeargs.front, rect3D)
                        .attr({
                            'stroke-width' : 0
                        });
                        rect3D.centerLight = renderer.path(Shapeargs.centerLight, rect3D)
                        .attr({
                            'stroke-width' : 0
                        });
                        rect3D.centerLight1 = renderer.path(Shapeargs.centerLight1, rect3D)
                        .attr({
                            'stroke-width' : 0
                        });
                        rect3D.toptop = renderer.path(Shapeargs.top, rect3D)
                        .attr({
                            'stroke-width' : 0
                        });
                        rect3D.topLight = renderer.path(Shapeargs.topLight, rect3D)
                        .attr({
                            'stroke-width' : 0
                        });
                        rect3D.topLight1 = renderer.path(Shapeargs.topLight1, rect3D)
                        .attr({
                            'stroke-width' : 0
                        });
                    }
                }

                return rect3D;
            };
        }
        )(),

        getPlotData: function (id) {
            var chart = this,
                dataset = chart.datasets[0],
                data = dataset.data[id],
                userData = dataset.userData || (dataset.userData = []),
                props = [
                    'y',
                    'name',
                    'color',
                    'alpha',
                    'borderColor',
                    'borderWidth',
                    'link',
                    'displayValue',
                    'toolText'
                ],
                plotData,
                i,
                prop;

            if (!userData[id]) {
                plotData = userData[id] = {};
                for (i = 0; i < props.length; i++) {
                    plotData[prop = props[i]] = data[prop];
                }

                plotData.value = plotData.y;
                plotData.label = plotData.name;

                delete plotData.y;
                delete plotData.name;
            }
            else {
                plotData = userData[id];
            }

            return plotData;
        },

        translate: function () {

            var chart = this,
                options = chart.options,
                dataset = chart.datasets[0],
                data = dataset.data,
                dataLen = data.length,

                width = chart.canvasWidth,
                height = chart.canvasHeight,

                drawingRadius = width / 2,

                drawingHeight = height,
                lastIndex = dataLen - 1,
                hasData = data[0],
                minValue = hasData && data[lastIndex].y,
                maxValue = hasData && data[0].y,
                unitHeight, lastRadius,
                newRadius, sliceHeight,
                y = chart.canvasTop,
                yScale = dataset.yScale,
                isHollow = dataset.isHollow,
                is2d = dataset.is2d,
                totalHeight = 0,

                renderer = chart.paper,

                slicingGapPosition = {},
                streamlinedData = dataset.streamlinedData,
                labelDistance = dataset.labelDistance,
                widthHeightRatio = 0.8 / drawingHeight,
                xPos,
                noOfGap = 0,
                x = drawingRadius + chart.canvasLeft,
                showLabelsAtCenter = dataset.showLabelsAtCenter,
                blankSpace = 3,

                fontSize = pluckNumber(parseInt(options.plotOptions.series.dataLabels.style.fontSize, 10), 10),
                yShift = fontSize * 0.3;

            if (!streamlinedData) {
                unitHeight = maxValue ? drawingHeight / maxValue : drawingHeight;
            }
            else {
                unitHeight = drawingHeight / (maxValue - minValue);
            }
            lastRadius = drawingRadius;
            each(data, function(point, i) {

                point.x = i;
                // set the shape
                if (i) {

                    //code for slicing drawing
                    if (point.isSliced) {
                        xPos = point.x;
                        if (xPos > 1 && !slicingGapPosition[xPos]) {
                            slicingGapPosition[xPos] = true;
                            noOfGap += 1;
                        }
                        if (xPos < lastIndex) {
                            slicingGapPosition[xPos + 1] = true;
                            noOfGap += 1;
                        }

                    }

                    if (!streamlinedData) {
                        totalHeight += sliceHeight = unitHeight * data[i].y;
                        newRadius = drawingRadius * (1 - (totalHeight * widthHeightRatio));
                    }
                    else{
                        if (dataset.useSameSlantAngle == 1) {
                            newRadius = maxValue ? drawingRadius * point.y / maxValue : drawingRadius;
                        } else {
                            newRadius = maxValue ? drawingRadius * mathSqrt(point.y / maxValue) : drawingRadius;
                        }
                        // Default sliceHeight is set to one, in case its NaN.
                        sliceHeight = unitHeight * (data[i - 1].y - point.y) || 1;
                    }
                    //funnel3d(x, y, R1, R2, h, r3dFactor, isHollow, gStr)
                    point.shapeArgs = {
                        x: x,
                        y: y,
                        R1: lastRadius,
                        R2: newRadius,
                        h: sliceHeight || 1,
                        r3dFactor: yScale,
                        isHollow: isHollow,
                        gStr: 'point',
                        is2D: is2d,
                        renderer: renderer,
                        isFunnel: true
                    };
                    if (showLabelsAtCenter) {
                        point.labelAline = 'middle';
                        //point.labelX = drawingWidth;
                        point.labelX = x;
                        point.labelY = (is2d ? y : y + (yScale * lastRadius)) + (sliceHeight / 2) + yShift;
                    }
                    else {
                        point.labelAline = 'start';
                        //point.labelX = drawingWidth;
                        point.labelX = x + labelDistance + newRadius + blankSpace;
                        point.labelY = y + yShift + sliceHeight;
                    }
                    y += sliceHeight;
                    lastRadius = newRadius;
                }
                else {
                    if (dataset.useSameSlantAngle == 1) {
                        newRadius = maxValue ? drawingRadius * data[0].y / maxValue : drawingRadius;
                    } else {
                        newRadius = maxValue ? drawingRadius * mathSqrt(data[0].y / maxValue) : drawingRadius;
                    }
                    if (point.labelWidht > newRadius * 2) {
                        point.labelAline = 'start';
                        point.labelX = 0;
                    }
                    else {
                        point.labelAline =  'middle';
                        point.labelX = x;
                    }
                    point.labelY = (is2d ? y : y - (yScale * lastRadius)) -
                        yShift - blankSpace ;
                }
                point.plotX = x;
                point.plotY = y;
            });
            //pass this calculation to the drawpoint
            dataset._temp = {
                slicingGapPosition : slicingGapPosition,
                noOfGap : noOfGap
            };

        },

        drawPlotFunnel: function(plot, dataOptions) {
            this.translate();

            var chart = this,
                plotItems = plot.items,
                plotData = plot.data,
                options = chart.options,
                plotOptions = options.plotOptions,
                dataset = chart.elements.plots[0],
                dataLabelOptions = plotOptions.series.dataLabels,
                paper = chart.paper,
                tooltipOptions = options.tooltip || {},
                isTooltip = tooltipOptions && tooltipOptions.enabled !== false,
                toolText,
                animDuration = plotOptions.series.animation.duration || 0,
                layers = chart.layers,
                trackerGroup = layers.tracker,
                dataLabelsGroup = layers.datalabels ||
                    (layers.datalabels = paper.group('datalabels').insertAfter(layers.dataset)),
                showLabelsAtCenter = dataset.showLabelsAtCenter,
                temp = dataOptions._temp || {},
                slicingGapPosition = temp.slicingGapPosition,
                noOfGap = temp.noOfGap,
                slicingDistance = dataOptions.SlicingDistance,
                perGapDistance,
                halfDistance = slicingDistance / 2,
                DistanceAvailed = 0,
                chartSliced = options.chart.issliced,
                style = dataLabelOptions.style,
                css = {
                    fontFamily: style.fontFamily,
                    fontSize: style.fontSize,
                    lineHeight: style.lineHeight,
                    fontWeight: style.fontWeight,
                    fontStyle: style.fontStyle
                },
                rolloverResponseSetter = function (elem, elemHoverAttr) {
                    return function (data) {
                        var ele = this;
                        elem.graphic.attr(elemHoverAttr);
                        plotEventHandler.call(ele, chart, data, ROLLOVER);
                    };
                },
                rolloutResponseSetter = function (elem, elemUnHoverAttr) {
                    return function (data) {
                        var ele = this;
                        elem.graphic.attr(elemUnHoverAttr);
                        plotEventHandler.call(ele, chart, data, ROLLOUT);
                    };
                },
                setRolloutAttr,
                setRolloverAttr,
                setRolloverProperties,
                plotItem,
                set,
                val,
                displayValue,
                sliced,
                setLink,
                translateXY,
                streamlinedData,
                i,
                legendClickHandler,
                getEventArgs,
                animateFunction;


            if (streamlinedData = chart.datasets[0].streamlinedData && plotData.length < 2) {
                return;
            }

            if (noOfGap) {
                perGapDistance = mathMin(halfDistance * 1.5, slicingDistance / noOfGap);
                DistanceAvailed = halfDistance;
            }

            legendClickHandler = function (plotItem) {
                return function () {
                    chart.legendClick(plotItem, true, false);
                };
            };

            getEventArgs = function (plotItem) {
                return function () {
                    return chart.getEventArgs(plotItem);
                };
            };

            animateFunction = function(dataLabelsGroup){
                return function() {
                    dataLabelsGroup.attr({
                        visibility: 'visible'
                    });
                };
            };

            // Spare the world if no data has been sent
            if (!(plotData && plotData.length)) {
                plotData = [];
            }

            dataset.singletonCase = (streamlinedData && plotData.length == 2 || plotData.length == 1);

            if (!dataOptions.data) {
                dataOptions.data = [];
            }

            i = plotData.length;
            while (i--) {
                set = plotData[i];
                val = set.y;
                displayValue = set.displayValue;
                toolText = set.toolText;
                setLink = !!set.link;

                /* If all plots are sliced, then set flag to false, to make the
                 * first slicing click on any of the plots will make it sliced. */
                sliced = chartSliced ? 0 : set.isSliced;

                if (val === null || val === undefined || !set.shapeArgs) {
                    dataOptions.data[i].plot = plotItems[i] = {
                        dataLabel: paper.text(dataLabelsGroup).attr({
                            text: displayValue,
                            title: (set.originalText || ''),
                            x: 0,
                            y: 0
                        })
                        .css(css)
                    };
                    continue;
                }

                if (!(plotItem = plotItems[i])) {
                    dataOptions.data[i].plot = plotItem = plotItems[i] = {
                        value: val,
                        displayValue: displayValue,
                        sliced: !!sliced,
                        chart: chart,
                        plotItems: plotItems,
                        seriesData: dataset,
                        cursor: setLink ? 'pointer' : '',
                        x: set.x,
                        index: i,
                        graphic: chart.pyramidFunnelShape(set.shapeArgs).attr({
                            fill: set.color,
                            opacity : 0,
                            'stroke-width': set.borderWidth,
                            stroke: set.borderColor
                        }),
                        dataLabel: paper.text(dataLabelsGroup)
                        .attr({
                            text: displayValue,
                            title: (set.originalText || ''),
                            ishot: true,
                            cursor: setLink ? 'pointer' : '',
                            x: 0,
                            y: 0
                        })
                        .css(css),
                        trackerObj: paper.path(trackerGroup)
                    };

                    // attach legend click event handler for slice
                    dataOptions.data[i].legendClick = (legendClickHandler(plotItem));
                    // attach getEventArgs method
                    dataOptions.data[i].getEventArgs = (getEventArgs(plotItem));

                    // Hover consmetics
                    setRolloutAttr = setRolloverAttr = {};
                    if (set.hoverEffects) {
                        setRolloutAttr = {
                            color: set.color,
                            opacity: set.alpha,
                            'stroke-width': set.borderWidth,
                            stroke: set.borderColor
                        };

                        setRolloverProperties = set.rolloverProperties;

                        setRolloverAttr = {
                            color: setRolloverProperties.color,
                            opacity: setRolloverProperties.alpha,
                            'stroke-width': setRolloverProperties.borderWidth,
                            stroke: setRolloverProperties.borderColor
                        };
                    }

                    !set.doNotSlice && plotItem.trackerObj.click(chart.slice, plotItem);
                    plotItem.trackerObj.mouseup(chart.plotMouseUp, plotItem);
                    plotItem.trackerObj.hover(rolloverResponseSetter(plotItem, setRolloverAttr),
                        rolloutResponseSetter(plotItem, setRolloutAttr));
                    plotItem.dataLabel.hover(rolloverResponseSetter(plotItem, setRolloverAttr),
                        rolloutResponseSetter(plotItem, setRolloutAttr));
                    isTooltip && plotItem.trackerObj.tooltip(toolText);

                    !set.doNotSlice && plotItem.dataLabel.click(chart.slice, plotItem);
                    plotItem.dataLabel.mouseup(chart.plotMouseUp, plotItem);

                    if (!showLabelsAtCenter || !(i === 0 && chart.type == 'funnel' &&
                            dataset.streamlinedData)) {
                        plotItem.connector = paper.path(dataLabelsGroup)
                        .attr({
                            'stroke-width': dataLabelOptions.connectorWidth,
                            stroke: dataLabelOptions.connectorColor,
                            ishot: true,
                            cursor: setLink ? 'pointer' : ''
                        })
                        .click(chart.slice, plotItem)
                        .mouseup(chart.plotMouseUp, plotItem)
                        .hover(rolloverResponseSetter(plotItem, setRolloverAttr),
                            rolloutResponseSetter(plotItem, setRolloutAttr));
                    }

                    plotItem.dy = 0;

                    if (noOfGap) {
                        if (DistanceAvailed) {
                            plotItem._startTranslateY = translateXY = 't0,' + DistanceAvailed;
                            plotItem.dy = plotItem.DistanceAvailed = DistanceAvailed;

                            plotItem.graphic.attr({
                                transform: translateXY
                            });

                            plotItem.dataLabel.attr({
                                transform: translateXY
                            });

                            plotItem.connector.attr({
                                transform: translateXY
                            });
                        }

                        if (slicingGapPosition[set.x]) {
                            DistanceAvailed -= perGapDistance;
                        }
                    }
                }



                if (animDuration) {
                    dataLabelsGroup.attr({
                        visibility: 'hidden'
                    });
                    plotItem.graphic.animate({
                        opacity: set.alpha
                    }, animDuration, 'easeIn', (i === plotData.length - 1) && (animateFunction(dataLabelsGroup)));
                }
                else {
                    plotItem.graphic.attr({
                        opacity: set.alpha
                    });
                }

            }

            chart.drawDataLabels();
            chart.drawTracker(plot, dataOptions);
        },

        slice: function (evt, x, y, sliced) {
            var dataItem = this,
                chart = dataItem.chart,
                dataset = chart.datasets[0],
                slicingDistance = dataset.SlicingDistance,
                seriesOptionsHalf = slicingDistance / 2,
                i = 0,
                noOFPrevPoint = 0,
                data = dataItem.plotItems,
                length = data.length,
                transformObj,
                dataObj,
                animDuration = 300,
                reflowData,
                itemClicked,
                clickedItemId,
                reflowUpdate,
                dyPrev,
                dyNext,
                dyOld,
                dyNew,
                slicingEnd;

            // save state
            reflowUpdate = {
                hcJSON: {
                    chart: {
                        issliced: false
                    },
                    series: []
                }
            };
            reflowUpdate.hcJSON.series[0] = {
                data: reflowData = []
            };

            sliced = dataItem.sliced = defined(sliced) ? sliced : !dataItem.sliced;

            dyPrev = -seriesOptionsHalf;
            dyNext = seriesOptionsHalf;

            slicingEnd = function (sliced, clickedItemId) {

                return function() {
                    /**
                     * SlicingEnd event is usually associated with a pie chart.
                     * In pie charts, on click a certain entity of the pie, the clicked slice is shown distinctly.
                     * The slicing start event is triggered as soon as the particular entity
                     * is clicked when the slicing is finished,
                     * the slicingEnd event is triggered.
                     * @event FusionCharts#slicingEnd
                     * @param {boolean} slicedState Indicates whether the data is sliced or not.
                     * @param {string} data The plot data from the chart to slice.
                     */
                    global.raiseEvent('SlicingEnd', {
                        slicedState: sliced,
                        data: chart.getPlotData(clickedItemId)
                    }, chart.logic.chartInstance);
                };
            };

            for (i = 0; i < length; i += 1) {
                dataObj = data[i];

                if (dataObj !== dataItem) {
                    dataObj.sliced = false;
                    reflowData[i] = {isSliced: false};
                    itemClicked = false;
                }
                else {
                    reflowData[i] = {isSliced: sliced};
                    itemClicked = true;
                    clickedItemId = i;
                }

                if (dataObj.graphic) {
                    dyOld = dataObj.dy;
                    dyNew = -dyOld;

                    if (sliced) {
                        if (dataObj.x < dataItem.x) {
                            dyNew += dyPrev;
                            noOFPrevPoint += 1;
                        }
                        else if (dataObj.x == dataItem.x) {
                            if (!noOFPrevPoint) {
                                dyNew += -seriesOptionsHalf * 0.5;
                            }
                            else if (i == length - 1) {
                                dyNew += seriesOptionsHalf * 0.5;
                            }
                        }
                        else {
                            dyNew += dyNext;
                        }
                    }
                    // The plot should be sent to ending y position, before invoking
                    // next slicing movement, as in the case of rapid slicing interactions.
                    dataObj.graphic.attr({
                        transform: 't0,' + dataObj.dy
                    });

                    dataObj.dy += dyNew;

                    transformObj = {transform: '...t0,' + dyNew};
                    /**
                     * SlicingStart event is usually associated with a pie chart.
                     * In pie charts, on click a certain entity of the pie, the clicked slice is shown distinctly.
                     * The slicing start event is triggered as soon as the particular entity is clicked.
                     * @event FusionCharts#slicingStart
                     * @param {boolean} slicedState Indicates whether the data is sliced or not.
                     * @param {string} data The plot data from the chart to slice.
                     */
                    itemClicked && global.raiseEvent('SlicingStart', {
                        slicedState: !sliced,
                        data: chart.getPlotData(clickedItemId)
                    }, chart.logic.chartInstance);

                    dataObj.graphic.animate(transformObj, animDuration, 'easeIn', itemClicked &&
                        slicingEnd(sliced, clickedItemId));
                    //for labels at center translate the labels
                    if (dataObj.dataLabel) {
                        dataObj.dataLabel.animate(transformObj, animDuration, 'easeIn');
                    }
                    if (dataObj.connector) {
                        dataObj.connector.animate(transformObj, animDuration, 'easeIn');
                    }
                    //for tracker translate it
                    if (dataObj.trackerObj) {
                        dataObj.trackerObj.animate(transformObj, animDuration, 'easeIn');
                    }
                    // For Funnel streamlinedData, the top label should move with top funnel,
                    // characterised by no graphic but with label for the plot. Topmost funnel
                    // is not the topmost plot here.
                    if (i == 1 && !data[0].graphic && data[0].dataLabel) {
                        data[0].dataLabel.animate(transformObj, animDuration, 'easeIn');
                    }
                }
            }
            extend2(chart.logic.chartInstance.jsVars._reflowData,
                reflowUpdate, true);
        },

        drawDataLabels: function () {
            var chart = this,
            dataset = chart.datasets[0],
            data = dataset.data,
            dataLabelOptions = chart.options.plotOptions.series.dataLabels,
            plotItems = chart.elements.plots[0].items,
            plotItem,
            labelX, labelY, labelAlign,
            connectorPath,
            showLabelsAtCenter = dataset.showLabelsAtCenter,
            lineHeight =  Number(dataLabelOptions.style.lineHeight.split(/px/)[0]),
            fontSize = pluckNumber(parseInt(dataLabelOptions.style.fontSize, 10), 10),
            yShift = fontSize * 0.3,
            yDisplacement = lineHeight * 0.3,
            lastplotY, lastConnectorEndY, connectorStartY, connectorEndY,
            i, point,
            blankSpace = 3,
            labelDistance = dataset.labelDistance,
            style = dataLabelOptions.style,
            displayValue,
            connectorEndX,
            connectorStartX,
            yD;

            for(i = data.length - 1; i >= 0; i -= 1) {
                point = data[i];
                displayValue = point.displayValue;
                plotItem = plotItems[i];
                labelY = point.labelY;
                labelX = point.labelX;
                labelAlign = point.labelAline;

                if (!showLabelsAtCenter) { // If labels to be place at center
                    //manage overlapping in height
                    connectorEndY = connectorStartY = labelY - yShift;
                    if (lastplotY !== undefined && lastConnectorEndY !== undefined &&
                        lastConnectorEndY - connectorStartY < lineHeight){
                        connectorEndY = lastConnectorEndY - lineHeight;
                        labelY = connectorEndY + yShift;
                    }
                    lastplotY = point.plotY;
                    lastConnectorEndY = connectorEndY;

                    // Drawing the connector for labels
                    // Check if the label is not blank and,
                    // label is not the first label of Funnel Chart
                    if ((typeof displayValue !== 'undefined' && displayValue !== BLANKSTRING) &&
                        !(i === 0 && chart.type == 'funnel' && dataset.streamlinedData)) {
                        connectorEndX = labelX - blankSpace;
                        connectorStartX = connectorEndX - labelDistance;
                        connectorPath = [M, connectorStartX, connectorStartY, L,
                        connectorEndX, connectorEndY];

                        plotItem.connector.attr({
                            path: connectorPath,
                            'shape-rendering': (connectorStartY === connectorEndY) && connectorEndY < 1 ? CRISP : ''
                        });
                    }

                    if (i === 0 && chart.type == 'funnel' && dataset.streamlinedData) {
                        yD = (labelY + (plotItems[1].DistanceAvailed || 0));
                    }
                    else {
                        yD = (connectorEndY + (plotItem.DistanceAvailed || 0));
                    }

                    if (displayValue !== BLANKSTRING) {
                        plotItem.dataLabel.attr({
                            transform: 't' + labelX + ',' + yD,
                            'text-anchor': textHAlign[labelAlign],
                            text: displayValue,
                            fill: style.color,
                            'text-bound': [style.backgroundColor, style.borderColor,
                                style.borderThickness, style.borderPadding,
                                style.borderRadius, style.borderDash]
                        });
                    }
                } else {
                    if (i === 0 && chart.type == 'funnel' && dataset.streamlinedData) {
                        yD = (labelY - yDisplacement + (plotItems[1].DistanceAvailed || 0));
                    }
                    else {
                        yD = (labelY - yDisplacement + (plotItem.DistanceAvailed || 0));
                    }

                    if (displayValue !== BLANKSTRING) {
                        plotItem.dataLabel.attr({
                            transform: 't' + labelX +','+ yD,
                            'text-anchor': textHAlign[labelAlign],
                            text: displayValue,
                            fill: style.color,
                            'text-bound': [style.backgroundColor, style.borderColor,
                                style.borderThickness, style.borderPadding,
                                style.borderRadius, style.borderDash]
                        });
                    }
                }
            }
        },

        drawTracker: function(plot) {
            var chart = this,
            renderer = chart.paper,
            plotItems = plot.items,
            plotData = plot.data,
            shapeArgs,
            trackerObj,
            trackerLabel = +new Date(),
            i = plotData.length - 1,
            point,
            layers = chart.layers,
            trackerGroup = layers.tracker,
            eventArgs,
            set;

            for (; i >= 0; i -= 1) {
                point = plotItems[i];
                set = plotData[i];
                trackerObj = point.trackerObj;

                if (point.graphic) {
                    shapeArgs = point.graphic.Shapeargs.silhuette;

                    eventArgs = {
                        link: set.link,
                        value: set.y,
                        displayValue: set.displayValue,
                        categoryLabel: set.categoryLabel,
                        toolText: set.toolText
                    };

                    if (trackerObj) {
                        trackerObj.attr({
                            path: shapeArgs,
                            isTracker: trackerLabel,
                            fill: TRACKER_FILL,
                            stroke: 'none',
                            transform: 't0,' + (point._startTranslateY || 0),
                            ishot: true,
                            cursor: point.cursor
                        });

                    } else {
                        point.trackerObj =
                        renderer.path(shapeArgs, trackerGroup)
                        .attr({
                            isTracker: trackerLabel,
                            fill: TRACKER_FILL,
                            stroke: 'none',
                            transform: 't0,' + (point._startTranslateY || 0),
                            ishot: true,
                            cursor: point.cursor
                        });
                    }
                    trackerObj.data('eventArgs', eventArgs);
                }
            }
        },

        getEventArgs: function (plot){
            return  plot.chart.getPlotData(plot.index);
        },

        legendClick: function(plot) {
            var chart = plot.chart;
            chart.slice.call(chart.plots[0].items[plot.index]);
        },

        plotMouseUp: function (data) {
            var plotItem = this,
                ele = plotItem.trackerObj;

            plotEventHandler.call(ele, plotItem.chart, data);
        }

    }, renderer['renderer.piebase']);

    renderer('renderer.pyramid', {

        type: 'pyramid',

        translate: function () {

            var chart = this,
                options = chart.options,
                dataset = chart.datasets[0],
                data = dataset.data,
                dataLen = data.length,
                width = chart.canvasWidth,
                height = chart.canvasHeight,
                drawingWidth = width / 2,
                drawingHeight = height,
                lastIndex = dataLen - 1,
                newRadius, sliceHeight,
                y = chart.canvasTop,
                yScale = dataset.yScale,
                is2d = dataset.is2d,
                renderer = chart.paper,
                sumValues = dataset.valueSum ? dataset.valueSum : 1,
                totalValues = 0,
                xPos,
                slicingGapPosition = {},
                noOfGap = 0,
                blankSpace = 3,
                labelDistance = dataset.labelDistance,
                showLabelsAtCenter = dataset.showLabelsAtCenter,
                fontSize = pluckNumber(parseInt(options.plotOptions.series.dataLabels.style.fontSize, 10), 10),
                yShift = fontSize * 0.3,
                x = chart.canvasLeft + drawingWidth,
                unitHeight = drawingHeight / sumValues,
                lastRadius = 0;

            each(data, function(point, id) {

                point.x = id;
                //code for slicing drawing
                if (point.isSliced) {
                    xPos = point.x;
                    if (xPos && !slicingGapPosition[xPos]) {
                        slicingGapPosition[xPos] = true;
                        noOfGap += 1;
                    }
                    if (xPos < lastIndex) {
                        slicingGapPosition[xPos + 1] = true;
                        noOfGap += 1;
                    }

                }

                totalValues += point.y;
                newRadius = drawingWidth * totalValues / sumValues;
                sliceHeight = unitHeight * point.y;
                point.shapeArgs =
                {
                    x: x,
                    y: y,
                    R1: lastRadius,
                    R2: newRadius,
                    h: sliceHeight,
                    r3dFactor: yScale,
                    gStr: 'point',
                    is2D: is2d,
                    renderer: renderer
                };

                if (showLabelsAtCenter) {
                    point.labelAline = 'middle';
                    //point.labelX = drawingWidth;
                    point.labelX = x;
                    point.labelY = (is2d ? y : y + (yScale * lastRadius)) + (sliceHeight / 2) + yShift;
                }
                else {
                    point.labelAline = 'start';
                    //point.labelX = drawingWidth;
                    point.labelX = x + labelDistance + (lastRadius + newRadius) / 2 + blankSpace;
                    point.labelY = y + yShift + (sliceHeight / 2);
                }

                y += sliceHeight;
                point.plotX = x;
                point.plotY = y - sliceHeight / 2;
                lastRadius = newRadius;
            });

            dataset._temp = {
                slicingGapPosition: slicingGapPosition,
                noOfGap: noOfGap
            };
        },

        drawPlotPyramid: function(plot, dataOptions) {
            this.translate();

            var chart = this,
                plotItems = plot.items,
                plotData = plot.data,
                options = chart.options,
                plotOptions = options.plotOptions,
                dataset = chart.elements.plots[0],
                series = chart.datasets[0],
                dataLabelOptions = plotOptions.series.dataLabels,
                showLabelsAtCenter = dataset.showLabelsAtCenter,
                animDuration = plotOptions.series.animation.duration || 0,
                paper = chart.paper,
                tooltipOptions = options.tooltip || {},
                isTooltip = tooltipOptions && tooltipOptions.enabled !== false,
                toolText,
                layers = chart.layers,
                trackerGroup = layers.tracker,
                dataLabelsGroup = layers.datalabels ||
                    (layers.datalabels = paper.group('datalabels').insertAfter(layers.dataset)),
                temp = series._temp || {},
                slicingGapPosition = temp.slicingGapPosition,
                noOfGap = temp.noOfGap,
                slicingDistance = series.SlicingDistance,
                perGapDistance,
                halfDistance = slicingDistance / 2,
                DistanceAvailed = 0,
                chartSliced = options.chart.issliced,
                style = dataLabelOptions.style,
                css = {
                    fontFamily: style.fontFamily,
                    fontSize: style.fontSize,
                    lineHeight: style.lineHeight,
                    fontWeight: style.fontWeight,
                    fontStyle: style.fontStyle
                },
                rolloverResponseSetter = function (elem, elemHoverAttr) {
                    return function (data) {
                        var ele = this;
                        elem.graphic.attr(elemHoverAttr);
                        plotEventHandler.call(ele, chart, data, ROLLOVER);
                    };
                },
                rolloutResponseSetter = function (elem, elemUnHoverAttr) {
                    return function (data) {
                        var ele = this;
                        elem.graphic.attr(elemUnHoverAttr);
                        plotEventHandler.call(ele, chart, data, ROLLOUT);
                    };
                },
                setRolloutAttr,
                setRolloverAttr,
                setRolloverProperties,
                plotItem,
                translateXY,
                set,
                setLink,
                val,
                displayValue,
                sliced,
                i,
                legendClickHandler,
                getEventArgs,
                animateFunction;

            legendClickHandler = function (plotItem) {
                return function () {
                    chart.legendClick(plotItem, true, false);
                };
            };

            getEventArgs = function (plotItem) {
                return function () {
                    return chart.getEventArgs(plotItem);
                };
            };

            animateFunction = function(dataLabelsGroup){
                return function() {
                    dataLabelsGroup.attr({
                        visibility: 'visible'
                    });
                };
            };

            if (noOfGap) {
                perGapDistance = mathMin(halfDistance * 1.5, slicingDistance / noOfGap);
                DistanceAvailed = halfDistance;
            }

            // Spare the world if no data has been sent
            if (!(plotData && plotData.length)) {
                plotData = [];
            }

            dataset.singletonCase = (plotData.length == 1);

            i = plotData.length;
            while (i--) {
                set = plotData[i];
                val = set.y;
                displayValue = set.displayValue;
                toolText = set.toolText;
                setLink = !!set.link;

                /* If all plots are sliced, then set flag to false, to make the
                 * first slicing click on any of the plots will make it sliced.*/
                sliced = chartSliced ? 0 : set.isSliced;

                if (val === null || val === undefined || !set.shapeArgs) {
                    dataOptions.data[i].plot = plotItems[i] = {
                        dataLabel: paper.text(dataLabelsGroup).attr({
                            text: displayValue,
                            title: (set.originalText || ''),
                            x: 0,
                            y: 0
                        })
                        .css(css)
                    };
                    continue;
                }

                if (!(plotItem = plotItems[i])) {
                    dataOptions.data[i].plot = plotItem = plotItems[i] = {
                        value: val,
                        sliced: !!sliced,
                        cursor: setLink ? 'pointer' : '',
                        chart: chart,
                        plotItems: plotItems,
                        seriesData: dataset,
                        x: set.x,
                        index: i,
                        graphic: chart.pyramidFunnelShape(set.shapeArgs).attr({
                            fill: set.color,
                            opacity : animDuration ? 0 : set.alpha,
                            'stroke-width': set.borderWidth,
                            stroke: set.borderColor
                        }),
                        dataLabel: paper.text(dataLabelsGroup)
                        .attr({
                            text: displayValue,
                            title: (set.originalText || ''),
                            ishot: true,
                            cursor: setLink ? 'pointer' : '',
                            x: 0,
                            y: 0
                        })
                        .css(css),
                        trackerObj: paper.path(trackerGroup)
                    };

                    // Hover consmetics
                    setRolloutAttr = setRolloverAttr = {};
                    if (set.hoverEffects) {
                        setRolloutAttr = {
                            color: set.color,
                            opacity: set.alpha,
                            'stroke-width': set.borderWidth,
                            stroke: set.borderColor
                        };

                        setRolloverProperties = set.rolloverProperties;

                        setRolloverAttr = {
                            color: setRolloverProperties.color,
                            opacity: setRolloverProperties.alpha,
                            'stroke-width': setRolloverProperties.borderWidth,
                            stroke: setRolloverProperties.borderColor
                        };
                    }

                    // attach legend click event handler for slice
                    dataOptions.data[i].legendClick = (legendClickHandler(plotItem));

                    // attach getEventArgs method
                    dataOptions.data[i].getEventArgs = (getEventArgs(plotItem));

                    !set.doNotSlice && plotItem.trackerObj.click(chart.slice, plotItem);
                    plotItem.trackerObj.mouseup(chart.plotMouseUp, plotItem)
                        .hover(rolloverResponseSetter(plotItem, setRolloverAttr),
                            rolloutResponseSetter(plotItem, setRolloutAttr));
                    isTooltip && plotItem.trackerObj.tooltip(toolText);

                    !set.doNotSlice && plotItem.dataLabel.click(chart.slice, plotItem);

                    plotItem.dataLabel.mouseup(chart.plotMouseUp, plotItem)
                        .hover(rolloverResponseSetter(plotItem, setRolloverAttr),
                            rolloutResponseSetter(plotItem, setRolloutAttr));

                    if (!showLabelsAtCenter || !(i === 0 && chart.type == 'funnel' && dataset.streamlinedData)) {
                        plotItem.connector = paper.path(dataLabelsGroup)
                            .attr({
                                'stroke-width': dataLabelOptions.connectorWidth,
                                stroke: dataLabelOptions.connectorColor,
                                ishot: true,
                                cursor: setLink ? 'pointer' : ''
                            })
                            .click(chart.slice, plotItem)
                            .mouseup(chart.plotMouseUp, plotItem)
                            .hover(rolloverResponseSetter(plotItem, setRolloverAttr),
                                rolloutResponseSetter(plotItem, setRolloutAttr));
                    }

                    plotItem.dy = 0;

                    if (noOfGap) {
                        if (DistanceAvailed) {
                            plotItem._startTranslateY = translateXY = 't,0,' + DistanceAvailed;
                            plotItem.dy = plotItem.DistanceAvailed = DistanceAvailed;

                            plotItem.graphic.attr({
                                transform: translateXY
                            });

                            plotItem.dataLabel.attr({
                                transform: translateXY
                            });

                            plotItem.connector.attr({
                                transform: translateXY
                            });
                        }
                        if (slicingGapPosition[set.x]) {
                            DistanceAvailed -= perGapDistance;
                        }
                    }
                }

                if (animDuration) {
                    dataLabelsGroup.attr('visibility', 'hidden');

                    plotItem.graphic.animate({
                        opacity: set.alpha
                    }, animDuration, 'easeIn', (i === plotData.length - 1) && (animateFunction(dataLabelsGroup)));
                }

            }

            chart.drawDataLabels();
            chart.drawTracker(plot, dataOptions);
        }

    }, renderer['renderer.funnel']);

    renderer('renderer.sparkline', {

        callbacks: [
            function() {

                if (this.options.nativeMessage) {
                    return;
                }

                var renderer = this,
                options = renderer.options,
                layers = renderer.layers,
                paper = renderer.paper,
                point = options.series[0] && options.series[0].data &&
                    options.series[0].data[0],
                dataLabelsGroup = layers.limitlabels,
                numberFormatter = renderer.numberFormatter,
                smartLabel = renderer.smartLabel,
                highValueLabel = numberFormatter.dataLabels(renderer.logic.highValue),
                lowValueLabel = numberFormatter.dataLabels(renderer.logic.lowValue),
                chartOptions = options.chart,
                valuePadding = chartOptions.valuePadding,
                fixedPadding = 2,
                canvasMiddle = (renderer.canvasHeight / 2),
                textStr,
                nextWidth;

                if (!point) {
                    return;
                }

                // create a separate group for the data labels to avoid rotation
                if (!dataLabelsGroup) {
                    dataLabelsGroup = layers.limitlabels = paper.group('limitlabels').insertAfter(layers.dataset);
                }

                dataLabelsGroup.translate(renderer.canvasLeft, renderer.canvasTop);

                // draw the openValue
                //if (typeof options.openValue != 'undefined') {
                if (defined(chartOptions.openValue.label)) {
                    point.openValue = paper.text( -valuePadding,
                        canvasMiddle, chartOptions.openValue.label, dataLabelsGroup)
                    .attr({
                        'text-anchor': textHAlign[POSITION_RIGHT]
                    })
                    .css(chartOptions.openValue.style);
                }

                // draw the closeValue
                textStr = chartOptions.closeValue.label;
                nextWidth = renderer.canvasWidth + valuePadding;
                if (defined(textStr)) {
                    point.closeValue = paper.text(renderer.canvasWidth + valuePadding,
                        canvasMiddle, textStr, dataLabelsGroup)
                    .attr({
                        'text-anchor': textHAlign[POSITION_LEFT]
                    })
                    .css(chartOptions.closeValue.style);

                    smartLabel.setStyle(chartOptions.closeValue.style);
                    nextWidth += (smartLabel.getOriSize(textStr).width + valuePadding);

                }

                // draw the high low value
                if (defined(highValueLabel)) {
                    paper.text(nextWidth, canvasMiddle, '[', dataLabelsGroup)
                        .attr({
                            'text-anchor': textHAlign[POSITION_LEFT]
                        })
                        .css(chartOptions.highLowValue.style);

                    smartLabel.setStyle(chartOptions.highLowValue.style);
                    nextWidth += (smartLabel.getOriSize('[').width + (fixedPadding / 2));

                    point.highLabel = paper.text(nextWidth, canvasMiddle,
                        highValueLabel, dataLabelsGroup)
                        .attr({
                            'text-anchor': textHAlign[POSITION_LEFT]
                        })
                        .css(chartOptions.highLowValue.style)
                        .css({color: chartOptions.highColor});

                    nextWidth += (smartLabel.getOriSize(highValueLabel).width + (fixedPadding / 2));
                }

                if (defined(lowValueLabel)) {
                    paper.text(nextWidth, canvasMiddle, '|', dataLabelsGroup)
                        .attr({
                            'text-anchor': textHAlign[POSITION_LEFT]
                        })
                        .css(chartOptions.highLowValue.style);

                    nextWidth += (smartLabel.getOriSize('|').width + (fixedPadding / 2));
                    point.dataLabel = paper.text(nextWidth, canvasMiddle,
                        lowValueLabel, dataLabelsGroup)
                    .attr({
                        'text-anchor': textHAlign[POSITION_LEFT]
                    })
                    .css(chartOptions.highLowValue.style)
                    .css({color: chartOptions.lowColor});

                    nextWidth += (smartLabel.getOriSize(lowValueLabel).width + (fixedPadding / 2));
                    paper.text(nextWidth, canvasMiddle, ']', dataLabelsGroup)
                        .attr({
                            'text-anchor': textHAlign[POSITION_LEFT]
                        })
                        .css(chartOptions.highLowValue.style);
                }
            }
        ]

    }, renderer['renderer.cartesian']);

    renderer('renderer.sparkwinloss', {

        callbacks: [function () {

                if (this.options.nativeMessage) {
                    return;
                }

                var renderer = this,
                    options = renderer.options,
                    layers = renderer.layers,
                    paper = renderer.paper,
                    point = options.series[0] && options.series[0].data &&
                        options.series[0].data[0],
                    dataLabelsGroup = layers.limitlabels,
                    style = options.plotOptions.series.dataLabels &&
                        options.plotOptions.series.dataLabels.style || {},
                    chartOptions = options.chart,
                    label = chartOptions.closeValue.label,
                    css = {
                        fontFamily: style.fontFamily,
                        fontSize: style.fontSize,
                        lineHeight: style.lineHeight,
                        fontWeight: style.fontWeight,
                        fontStyle: style.fontStyle
                    };

                if (!point) {
                    return;
                }

                // create a separate group for the data labels to avoid rotation
                if (!dataLabelsGroup) {
                    dataLabelsGroup = layers.limitlabels =
                        paper.group('limitlabels').insertAfter(layers.dataset);
                }

                dataLabelsGroup.translate(renderer.canvasLeft, renderer.canvasTop);

                if (defined(label) && label !== BLANK) {
                    point.dataLabel = paper.text(renderer.canvasWidth +
                        chartOptions.valuePadding, renderer.canvasHeight / 2,
                        label, dataLabelsGroup)
                    .attr({
                        'text-anchor': textHAlign[POSITION_LEFT],
                        fill: style.color,
                        'text-bound': [style.backgroundColor, style.borderColor,
                            style.borderThickness, style.borderPadding,
                            style.borderRadius, style.borderDash]
                    })
                    .css(css);
                }

            }]

    }, renderer['renderer.cartesian']);

    renderer('renderer.realtimecartesian', {
        updatePlotColumn: function (plot, dataOptions, RTOptions) {

            var chart = this,
                data = plot.data,
                ln = data.length,
                plotItems = plot.items,
                datasetGraphics = plot.graphics || (plot.graphics = []),

                paper = chart.paper,
                logic = chart.logic,
                layers = chart.layers,
                options = chart.options,
                chartOptions = options.chart,

                // tooltip options
                tooltipOptions = options.tooltip || {},
                isTooltip = tooltipOptions.enabled !== false,

                // Directly Accessing chart definition JSON Data
                chartAttributes = chart.definition.chart,
                seriesOptions = options.plotOptions.series,
                xAxis = chart.xAxis[dataOptions.xAxis || 0],
                yAxis = chart.yAxis[dataOptions.yAxis || 0],

                // is stacked chart
                isStacked = logic.isStacked,

                numColumns = dataOptions.numColumns || 1,
                columnPosition = dataOptions.columnPosition || 0,

                canvasBorderOpacity = chartOptions. canvasBorderOpacity =
                    R.color(chartOptions.plotBorderColor).opacity,
                canvasBorderWidth = chart.canvasBorderWidth,
                hasValidCanvasBorder = chartOptions.isCanvasBorder ||
                    (chartOptions.isCanvasBorder =
                            canvasBorderOpacity !== 0 && canvasBorderWidth > 0),
                columnBaseHotFixDelta,

                seriesVisibility = dataOptions.visible === false ?
                        'hidden': 'visible',
                overlapColumns = chartOptions.overlapColumns,

                xAxisZeroPos = xAxis.getAxisPosition(0),
                xAxisFirstPos = xAxis.getAxisPosition(1),
                groupMaxWidth = xAxisFirstPos - xAxisZeroPos,
                definedGroupPadding = chartAttributes &&
                        chartAttributes.plotspacepercent,
                groupPadding = seriesOptions.groupPadding,
                maxColWidth = seriesOptions.maxColWidth,
                plotPaddingPercent = pluckNumber(chartAttributes &&
                            chartAttributes.plotpaddingpercent),

                groupNetWidth = (1 - definedGroupPadding * 0.01) * groupMaxWidth ||
                    mathMin(
                        groupMaxWidth * (1 - groupPadding * 2),
                        maxColWidth * numColumns
                    ),
                groupNetHalfWidth = groupNetWidth / 2,
                columnWidth = groupNetWidth / numColumns,

                plotPadding = numColumns > 1 ?
                            !overlapColumns && plotPaddingPercent === UNDEFINED ?
                                4:
                                plotPaddingPercent > 0 ? (columnWidth * plotPaddingPercent / 100) : 0
                            : 0,
                plotEffectivePadding = mathMin(columnWidth - 1, plotPadding),

                width = columnWidth - plotEffectivePadding,
                xPosOffset = (columnPosition * columnWidth) - groupNetHalfWidth +
                                plotEffectivePadding /2,

                yMax = yAxis.max,
                yMin = yAxis.min,

                isAllPositive = yMax > 0 && yMin > 0,
                isAllPositiveZero = yMax > 0 && yMin >= 0,
                isAllNegative = yMax < 0 && yMin < 0,
                isAllNegativeZero = yMax <= 0 && yMin < 0,
                yBase = isAllNegative ? yMax : (isAllPositive ? yMin : 0),

                plotRadius = pluckNumber(chartOptions.useRoundEdges, 0),

                datasetLayer = layers.dataset = layers.dataset ||
                        paper.group('dataset-orphan'),
                trackerLayer = layers.tracker,

                canvasTop = chart.canvasTop,
                canvasLeft = chart.canvasLeft,
                canvasBottom = chart.canvasBottom,
                canvasRight = chart.canvasRight,

                MINHEIGHT = 1,
                plotItem,
                i,
                set,
                setLink,
                setBorderWidth,
                setDisplayValue,
                toolText,
                x,
                y,
                previousY,
                xPos,
                yPos,
                previousYPos,
                valEle,
                height,

                // Hover settings
                setHoverEffect,
                setRolloverProperties,
                setRolloutAttr,
                setRolloverAttr,

                group,
                plotGroup,
                targetGroup,
                shadowGroup,
                crispBox,
                k,
                numUpdate,
                eventArgs,
                hoverRollOver,
                hoverRollOut,
                clickHandler;

            hoverRollOver = function (elem, elemHoverAttr){
                return function (data) {
                    var ele = this;
                    elem.attr(elemHoverAttr);
                    plotEventHandler.call(ele,
                        chart, data, 'dataplotrollover');
                };
            };

            hoverRollOut = function (elem, elemUnHoverAttr){
                return function (data) {
                    var ele = this;
                    elem.attr(elemUnHoverAttr);
                    plotEventHandler.call(ele,
                        chart, data, 'dataplotrollout');
                };
            };

            clickHandler = function (data) {
                var ele = this;
                plotEventHandler.call(ele, chart, data);
            };



            // define groups
            group = datasetLayer;
            if (isStacked) {
                shadowGroup = group.shadows ||
                        (group.shadows = paper.group('shadows', group).toBack());
            }
            plotGroup = group.column = (group.column || paper.group('columns', group));

            targetGroup = plotGroup;

            // Recycle elements that are supposed to go out of chart canvas
            // iterate number of updates
            numUpdate = RTOptions.numUpdate || 0;
            if (numUpdate) {
                for (i = 0; i < numUpdate; i += 1) {
                    // remove element from beginning and add it to the end
                    plotItem = plotItems.shift();

                    // delete any state related data stored in the plotItem.
                    plotItem && delete plotItem._state;

                    plotItems.push(plotItem);
                }
            }


            //draw plots
            for (i = 0; i < ln; i += 1) {

                k = i + numUpdate;
                set = data[i];
                y = set.y;
                x = pluckNumber(set.x, i);
                xPos = xAxis.getAxisPosition(x) + xPosOffset;
                plotItem = plotItems[i];

                toolText = set.toolText;
                setLink = set.link;
                setDisplayValue = set.displayValue || BLANKSTRING;
                setBorderWidth = toFloat(set.borderWidth) || 0;

                eventArgs = {
                    index: i,
                    link: setLink,
                    value: y,
                    displayValue: set.displayValue,
                    categoryLabel: set.categoryLabel,
                    toolText: toolText,
                    id: plot.userID,
                    datasetIndex: plot.index,
                    datasetName: plot.name,
                    visible: plot.visible
                };

                // for new data:
                // create new elements only if the elements do not exist
                // or update existing elements
                if (k >= ln) {
                    if (!plotItem){
                        plotItem = plotItems[i] = {
                            index: i,
                            value: y,
                            width: width,
                            graphic: null,
                            dataLabel: null,
                            tracker: null
                        };
                    }
                    // direction of datalabels
                    plotItem && (plotItem.valueBelowPlot =  y < 0);

                    // Hover consmetics
                    setRolloutAttr = setRolloverAttr = {};
                    if ((setHoverEffect = set.hoverEffects)) {
                        setRolloutAttr = {
                            fill: toRaphaelColor(set.color),
                            stroke: toRaphaelColor(set.borderColor),
                            'stroke-width': setBorderWidth,
                            'stroke-dasharray': set.dashStyle
                        };

                        setRolloverProperties = set.rolloverProperties;

                        setRolloverAttr = {
                            fill: toRaphaelColor(setRolloverProperties.color),
                            stroke: toRaphaelColor(setRolloverProperties.borderColor),
                            'stroke-width': setRolloverProperties.borderWidth,
                            'stroke-dasharray': setRolloverProperties.dashStyle
                        };
                    }

                    if (!plotItem.graphic){
                        plotItem.graphic =  paper.rect(targetGroup)
                            .attr({
                                'visibility': seriesVisibility
                            });
                        datasetGraphics.push(plotItem.graphic);

                        plotItem.graphic
                            .shadow(seriesOptions.shadow && set.shadow, shadowGroup);

                    }
                    plotItem.graphic.attr({
                        r: plotRadius,
                        fill: toRaphaelColor(set.color || ''),
                        stroke: toRaphaelColor(set.borderColor || ''),
                        'stroke-width': setBorderWidth,
                        'stroke-dasharray': set.dashStyle,
                        'stroke-linejoin': 'miter'
                    });

                    //if no tracker then create it with all static attribites
                    if (!plotItem.tracker) {
                        plotItem.tracker = paper.rect(trackerLayer).attr({
                            stroke: TRACKER_FILL,
                            'fill': TRACKER_FILL,
                            'visibility': seriesVisibility
                        });
                        datasetGraphics.push(plotItem.tracker);

                    }

                    // unregister click,hover events since this might be a reused element
                    // but if this element was originally created from drawPlot functions
                    // the events will not be de-registered
                    if (plotItem._attrHoverInFn) {
                        plotItem.tracker.unhover(plotItem._attrHoverInFn, plotItem._attrHoverOutFn);
                    }
                    if (plotItem._attrClickFn) {
                        plotItem.tracker.unclick(plotItem._attrClickFn);
                    }

                    plotItem.tracker.attr({
                        height: 0,
                        width: 0,
                        r: plotRadius,
                        'stroke-width': setBorderWidth,
                        stroke: TRACKER_FILL,
                        'cursor': setLink ? 'pointer' : '',
                        ishot: true
                    })
                    .data('eventArgs', eventArgs)
                    .click((plotItem._attrClickFn = clickHandler))
                    .hover(
                        (plotItem._attrHoverInFn = hoverRollOver(plotItem.graphic, setRolloverAttr)),
                        (plotItem._attrHoverOutFn = hoverRollOut(plotItem.graphic, setRolloutAttr))
                    )
                   .tooltip(toolText);
                }

                plotItem && (plotItem.index  = i);

                if (y === null){
                    // hide elements (if they exist) for null values
                    if (plotItem) {
                        plotItem.graphic && plotItem.graphic.attr({
                                height: 0,
                                'stroke-width': 0
                            });
                        plotItem.tracker && plotItem.tracker.attr({
                                height: 0,
                                'stroke-width': 0
                            });

                        plotItem.dataLabel && plotItem.dataLabel.attr({
                                text: ''
                            });


                    }
                }
                // When valid values are received
                 else {

                    previousY = set.previousY;
                    previousYPos = yAxis.getAxisPosition(previousY || yBase);
                    yPos = yAxis.getAxisPosition(y + (previousY || 0));
                    height = mathAbs(yPos - previousYPos);

                    // revert rect on negative values
                    if (y < 0) {
                        yPos = previousYPos;
                    }

                    /* hotfixes start */
                    // in case yPos is above canvas-top position -
                    // normalize
                    if (toInt(yPos) <= canvasTop) {
                        height -= canvasTop - yPos -
                                (+hasValidCanvasBorder);
                        yPos = canvasTop - (+hasValidCanvasBorder);
                    }
                    // in case plot exceeds canvas-bottom position -
                    // normalize height
                    if (mathRound(yPos + height) >= canvasBottom) {

                        height -= mathRound(yPos + height) - canvasBottom +
                                ((+!!setBorderWidth)) +
                                (+hasValidCanvasBorder);

                    }

                    if (setBorderWidth <= 1) {
                        // in case xPos is right of canvas-left position -
                        // normalize
                        if (mathRound(xPos) <= canvasLeft) {
                            width += xPos;
                            xPos = canvasLeft - (setBorderWidth / 2) +
                                    (+!!setBorderWidth) - (+hasValidCanvasBorder);
                            width -= xPos;
                        }
                        // in case plot exceeds canvas-right position -
                        // normalize width
                        if (mathRound(xPos + width) >= canvasRight) {
                            width = canvasRight - xPos + (setBorderWidth / 2) -
                                    (+!!setBorderWidth) + (+hasValidCanvasBorder);
                        }

                    }
                    /* hotfixes end */

                    // get crisp rectangle coordinates
                    crispBox = R.crispBound(xPos, yPos, width, height, setBorderWidth);
                    xPos = crispBox.x;
                    yPos = crispBox.y;
                    width = crispBox.width;
                    height = crispBox.height;


                    // start base hotfix
                    if (hasValidCanvasBorder && !defined(previousY)) {

                        // hotfix top when all columns are drawn from top
                        if (isAllNegativeZero) {

                            columnBaseHotFixDelta = yPos - (canvasTop - setBorderWidth / 2);
                            height += columnBaseHotFixDelta;
                            yPos = yPos - columnBaseHotFixDelta;
                        }

                        // hotfix bottom when all columns are drawn from bottom
                        else if (isAllPositiveZero) {
                            height = (canvasBottom - yPos) + setBorderWidth / 2;
                        }
                    }
                    // end base hotfix


                    //make zero columns visibles
                    if (height <= MINHEIGHT) {
                        height = MINHEIGHT;
                        yPos += y < 0 ? 0: - height;
                    }

                    // draw or update column
                    if (plotItem && plotItem.graphic) {
                        plotItem.graphic.attr({
                                x: xPos,
                                y: yPos,
                                width: width,
                                height: height
                            })
                            // store data to be processed by drawPlotColumnLabel
                            .data('BBox', crispBox);

                        // draw or update label
                        plotItem.dataLabel &&
                        plotItem.dataLabel.attrs.text !== setDisplayValue &&
                        plotItem.dataLabel.attr({
                            text: setDisplayValue
                        });

                        valEle = chart.drawPlotColumnLabel(plot, dataOptions, i, xPos, yPos);

                      // create hot element if required
                        if (setLink || isTooltip) {
                              // add a big tracker in case the value too small for
                              // click or touch. Applicable only in non-stacked
                            if (!isStacked && height < HTP) {
                                yPos -= (HTP - height) / 2;
                                height = HTP;
                            }

                            plotItem.tracker && plotItem.tracker.attr({
                                    x: xPos,
                                    y: yPos,
                                    width: width,
                                    height: height
                                });

                        }
                    }
                }
            }

            return plot;
        },

        updatePlotLine: function (plot, dataOptions, RTOptions ){
            var chart = this,
                paper = chart.paper,
                options = chart.options,
                chartOptions = options.chart,
                seriesOptions = options.plotOptions.series,
                plotItems = plot.items,
                datasetGraphics = plot.graphics || (plot.graphics = []),

                plotItem,
                xAxis = chart.xAxis[dataOptions.xAxis || 0],
                yAxis = chart.yAxis[dataOptions.yAxis || 0],

                // tooltip options
                tooltipOptions = options.tooltip || {},
                isTooltip = tooltipOptions.enabled !== false,


                data = plot.data,

                seriesVisibility = dataOptions.visible === false ?
                        'hidden': 'visible',
                i,
                ln = data.length,


                connectNullData = seriesOptions.connectNullData,
                set,
                setLink,
                setDisplayValue,
                toolText,
                x,
                y,
                lastXPos,
                lastYPos = null,
                xPos,
                yPos,
                seriesLineWidth = dataOptions.lineWidth,
                plotColor = dataOptions.color,
                setColor,
                setDashStyle,
                marker,
                markerRadius,
                trackerRadius,
                markerLineWidth,
                markerFillColor,
                markerLineColor,

                // Hover settings
                setRolloverProperties,
                setRolloutAttr,
                setRolloverAttr,

                symbol,
                setMarkerElem,
                setLineElem,

                layers = chart.layers,
                datasetLayer = layers.dataset = layers.dataset ||
                        paper.group('dataset-orphan'),
                trackerLayer = layers.tracker,
                linePath,
                nullLinePath = 'M-9999,-9999Lh-1',
                valEle,

                group,
                lineGroup,
                markerGroup,
                lineGroupParent,
                lineShadowGroup,
                anchorShadowGroup,
                anchorShadow,
                plotState,

                k,
                imgRef,
                numUpdate,
                eventArgs,
                imageUrl,
                isImage,
                clickHandler,
                hoverRollOver,
                hoverRollOut,
                imageOnErrorHandler,
                imageOnLoad;

            clickHandler = function (data) {
                var ele = this;
                plotEventHandler.call(ele, chart, data);
            };

            hoverRollOver = function (plotItem) {
                return function (data) {
                    chart.hoverPlotAnchor(this, data, ROLLOVER, plotItem, chart);
                };
            };

            hoverRollOut = function (plotItem) {
                return function (data) {
                    chart.hoverPlotAnchor(this, data, ROLLOUT, plotItem, chart);
                };
            };


            imageOnLoad = function(x, y, marker, plotItem,
                    eventArgs, toolText, setRollover, i, setLink) {
                return function() {
                    var imgRef = this,
                        url = marker.imageUrl,
                        scale = marker.imageScale,
                        alpha = marker.imageAlpha,
                        hoverAlpha = setRollover.imageHoverAlpha,
                        hoverScale = setRollover.imageHoverScale,
                        imgW = imgRef.width * scale * 0.01,
                        hotW = (imgRef.width * hoverScale * 0.01),
                        trackerAttr;

                    setRolloutAttr = {
                        x: x - imgRef.width * scale * 0.005,
                        y: y - imgRef.height * scale * 0.005,
                        width: imgW,
                        height: imgRef.height * scale * 0.01,
                        alpha: alpha
                    };

                    setRolloverAttr = {
                        x: x - imgRef.width * hoverScale * 0.005,
                        y: y - imgRef.height * hoverScale * 0.005,
                        width: hotW,
                        height: imgRef.height * hoverScale * 0.01,
                        alpha: hoverAlpha
                    };

                    trackerAttr = (hotW > imgW) ?
                        setRolloverAttr : setRolloutAttr;

                    plotItem.graphic && plotItem.graphic
                    .attr(setRolloutAttr)
                    .attr('src', url)
                    .css({
                        opacity: alpha * 0.01
                    })
                    .data('alwaysInvisible', scale === 0)
                    .data('setRolloverProperties', setRollover)
                    .data('setRolloverAttr', setRolloverAttr)
                    .data('setRolloutAttr', setRolloutAttr)
                    .data('anchorRadius', scale)
                    .data('anchorHoverRadius', hoverScale);


                    if (setLink || isTooltip || setRollover) {
                        plotItem.tracker
                        .attr(trackerAttr)
                        .attr({
                            cursor: setLink ? 'pointer' : '',
                            stroke: TRACKER_FILL,
                            'stroke-width': marker.lineWidth,
                            fill: TRACKER_FILL,
                            ishot: true,
                            visibility: seriesVisibility
                        })
                        .data('eventArgs', eventArgs);

                        chart.drawTracker &&
                            chart.drawTracker.call(chart,
                            plot, dataOptions, i);
                    }
                    valEle = plotItem.dataLabel =
                        chart.drawPlotLineLabel(plot,
                    dataOptions, i, x, y);
                    valEle && datasetGraphics.push(valEle);
                };
            };

            imageOnErrorHandler = function(x, y, marker,
                plotItem, eventArgs, toolText, setRollover, i) {
                // Handle if image load error
                return function() {
                    valEle = plotItem.dataLabel =
                        chart.drawPlotLineLabel(plot,
                            dataOptions, i, x, y);
                    valEle && datasetGraphics.push(valEle);
                };
            };

            //create series group
            group = datasetLayer;
            lineGroupParent = group.line || (group.line = paper.group('line-connector', group));
            lineShadowGroup = plot.lineShadowLayer ||
                    (plot.lineShadowLayer = paper.group('connector-shadow', lineGroupParent));
            anchorShadowGroup = plot.anchorShadowLayer ||
                    (plot.anchorShadowLayer = paper.group('anchor-shadow', lineGroupParent));
            lineGroup = plot.lineLayer ||
                    (plot.lineLayer = paper.group('connector', lineGroupParent));
            markerGroup = plot.anchorLayer ||
                    (plot.anchorLayer = paper.group('anchors', lineGroupParent));

            // Recycle elements that are supposed to go out of chart canvas
            // iterate number of updates
            numUpdate = RTOptions.numUpdate || 0;
            if (numUpdate) {
                for (i = 0; i < numUpdate; i += 1) {
                    // remove element from beginning and add it to the end
                    plotItem = plotItems.shift();

                    // delete any state related data stored in the plotItem.
                    plotItem && delete plotItem._state;

                    plotItems.push(plotItem);
                }
            }

            //draw anchor and line
            for (i = 0; i < ln; i += 1) {

                k = i + numUpdate;
                set = data[i];
                y = set.y;
                x = pluckNumber(set.x, i);
                xPos = xAxis.getAxisPosition(x);

                toolText = set.toolText;
                setLink = set.link;
                setDisplayValue = set.displayValue || BLANKSTRING;

                marker = set.marker || {};
                markerRadius = trackerRadius = marker.radius || 0;
                anchorShadow = marker.shadow;
                markerLineWidth = marker.lineWidth || 0;
                markerFillColor = marker.fillColor || '';
                markerLineColor = marker.lineColor || '';
                imageUrl = marker.imageUrl;
                isImage = !!imageUrl;
                plotItem = plotItems[i];
                plotState = plotItem._state || (plotItem._state = {});
                // for new data:
                // create new elements only if the elements do not exist
                // or update existing elements
                if (k >= ln) {

                    if (!plotItem){
                        plotItem = plotItems[i] = {
                            index: i,
                            value: y,
                            graphic: null,
                            connector: null,
                            dataLabel: null,
                            tracker: null
                        };
                    }

                    if ((plotItem.graphic && plotItem.graphic.type === 'image' &&
                            !isImage)) {
                        plotItem.graphic && plotItem.graphic.remove();
                        plotItem.tracker && plotItem.tracker.remove();
                        plotItem.graphic = plotItem.tracker = null;
                    }
                    //add attributes that will never update during movement
                    if (!plotItem.graphic) {
                        plotItem.graphic =  (isImage ? paper.image(markerGroup)
                            : paper.polypath(markerGroup)).attr({
                                'visibility': seriesVisibility
                            });

                        datasetGraphics.push(plotItem.graphic);
                    }
                    if (!isImage) {
                        plotItem.graphic.attr({
                            fill: toRaphaelColor(markerFillColor),
                            'stroke-width': markerLineWidth,
                            stroke: toRaphaelColor(markerLineColor)
                        });
                    }

                    if (!plotItem.connector) {
                        plotItem.connector =
                            paper.path(lineGroup)
                            .attr({
                                'visibility': seriesVisibility
                            });

                        plotItem.connector
                                .shadow(seriesOptions.shadow && set.shadow, lineShadowGroup);

                        datasetGraphics.push(plotItem.connector);

                    }
                    plotItem.connector.attr({
                        'stroke-dasharray': setDashStyle,
                        'stroke': toRaphaelColor(setColor || plotColor),
                        'stroke-width': seriesLineWidth,
                        'stroke-linecap': 'round',
                        'stroke-linejoin': seriesLineWidth > MAX_MITER_LINEJOIN ?
                                'round' : 'miter'
                    });

                    //if no tracker then create it with all static attribites
                    if (!plotItem.tracker) {
                        plotItem.tracker = (isImage ? paper.rect(trackerLayer) :
                            paper.circle(trackerLayer)).attr({
                                stroke: TRACKER_FILL,
                                'fill': TRACKER_FILL,
                                'visibility': seriesVisibility
                            });
                        datasetGraphics.push(plotItem.tracker);

                    }

                    trackerRadius = mathMax (trackerRadius,
                    setRolloverProperties && setRolloverProperties.radius || 0,
                        chartOptions.anchorTrackingRadius);

                    eventArgs = {
                        index: i,
                        link: setLink,
                        value: set.y,
                        displayValue: set.displayValue,
                        categoryLabel: set.categoryLabel,
                        toolText: set.toolText,
                        id: plot.userID,
                        datasetIndex: plot.index,
                        datasetName: plot.name,
                        visible: plot.visible
                    };
                    // unregister click,hover events since this might be a reused element
                    // but if this element was originally created from drawPlot functions
                    // the events will not be de-registered
                    if (plotItem._attrClickFn) {
                        plotItem.tracker.unclick(plotItem._attrClickFn);
                    }
                    if (plotItem._attrHoverInFn) {
                        plotItem.tracker.unhover(plotItem._attrHoverInFn, plotItem._attrHoverOutFn);
                    }

                    plotItem.tracker.attr({
                        r: trackerRadius,
                        'stroke-width': markerLineWidth,
                        stroke: TRACKER_FILL,
                        'cursor': setLink ? 'pointer' : '',
                        ishot: true
                    })
                    .data('eventArgs', eventArgs)
                    .click((plotItem._attrClickFn = clickHandler))
                    .hover(
                        ((plotItem._attrHoverInFn =  hoverRollOver(plotItem))),
                        ((plotItem._attrHoverOutFn =  hoverRollOut(plotItem)))
                    )
                    .tooltip(toolText);


                }

                plotItem && (plotItem.index  = i);

                if (y === null){

                    if (plotItem) {
                        plotItem.graphic && plotItem.graphic.attr({
                                polypath: [2, 0, 0, 0, 0, 0],
                                'stroke-width': 0
                            });

                        plotItem.dataLabel && plotItem.dataLabel.attr({
                                text: ''
                            });

                        plotItem.connector && plotItem.connector.attr({
                                path: nullLinePath,
                                'stroke-width': 0
                            });

                        plotItem.tracker && plotItem.tracker.attr({
                                r: 0,
                                'stroke-width': 0
                            });

                    }


                    if (connectNullData === 0) {
                        lastYPos = null;

                    }
                }
                else {
                    yPos = yAxis.getAxisPosition(y);

                    // draw or update anchor
                    if (marker && marker.enabled) {
                        symbol = marker.symbol.split('_');
                        setMarkerElem = plotItem.graphic;
                        // Hover consmetics
                        setRolloutAttr = setRolloverAttr = {};
                        setRolloverProperties = set.rolloverProperties;
                        if (isImage) {
                            if (k >= ln) { // New image data
                                imgRef = new win.Image();
                                imgRef.onload = imageOnLoad(xPos, yPos, marker, plotItem, eventArgs,
                                    toolText, setRolloverProperties, i, setLink);

                                imgRef.onerror = imageOnErrorHandler(xPos, yPos, marker, plotItem, eventArgs,
                                        toolText, setRolloverProperties, i);
                                imgRef.src = marker.imageUrl;
                            } else {
                                setRolloverAttr = setMarkerElem.data('setRolloverAttr');
                                setRolloutAttr = setMarkerElem.data('setRolloutAttr');

                                if (setRolloverAttr) {
                                    setRolloverAttr.x = xPos - setRolloverAttr.width * 0.5;
                                    setRolloverAttr.y = yPos - setRolloverAttr.height * 0.5;

                                    setMarkerElem && setMarkerElem.stop();
                                    plotItem.dataLabel && plotItem.dataLabel.stop();

                                    setRolloutAttr.x = xPos - setRolloutAttr.width * 0.5;
                                    setRolloutAttr.y = yPos - setRolloutAttr.height * 0.5;

                                    setMarkerElem.attr(setRolloutAttr);

                                    plotItem.tracker && plotItem.tracker.attr({
                                        x: setRolloutAttr.x,
                                        y: setRolloutAttr.y,
                                        fill: TRACKER_FILL
                                    });
                                }
                            }
                        } else {
                            if ((setRolloverProperties = set.rolloverProperties)) {
                                setRolloutAttr = {
                                    polypath: [symbol[1] || 2, xPos, yPos,
                                     markerRadius, marker.startAngle, 0],
                                    fill: toRaphaelColor(marker.fillColor),
                                    'stroke-width': marker.lineWidth,
                                    stroke: toRaphaelColor(marker.lineColor)
                                };

                                setRolloverProperties = set.rolloverProperties;

                                setRolloverAttr = {
                                    polypath: [setRolloverProperties.sides || 2,
                                        xPos, yPos,
                                        setRolloverProperties.radius,
                                        setRolloverProperties.startAngle,
                                        setRolloverProperties.dip],
                                    fill: toRaphaelColor(setRolloverProperties.fillColor),
                                    'stroke-width': setRolloverProperties.lineWidth,
                                    stroke: toRaphaelColor(setRolloverProperties.lineColor)
                                };
                            }

                            setMarkerElem && setMarkerElem.attr({
                                polypath:[symbol[1] || 2, xPos, yPos,
                                    markerRadius, marker.startAngle,
                                0],
                                'visibility': markerRadius === 0 ? 'hidden':
                                    seriesVisibility
                            })
                            .data('isRealtime', true)
                            .data('alwaysInvisible', markerRadius === 0)
                            .data('setRolloverProperties', setRolloverProperties)
                            .data('setRolloverAttr', setRolloverAttr)
                            .data('setRolloutAttr', setRolloutAttr)
                            .data('anchorRadius', markerRadius)
                            .data('anchorHoverRadius', setRolloverProperties &&
                                    setRolloverProperties.radius)
                            .shadow(anchorShadow || false, anchorShadowGroup);


                            // create hot element if required
                            if (setLink || isTooltip) {

                                plotItem.tracker &&
                                    plotItem.tracker.attr({
                                        cx: xPos,
                                        cy: yPos
                                    });
                            }
                        }
                    }

                    // draw or update label
                    plotItem.dataLabel &&
                    plotItem.dataLabel.attrs.text != setDisplayValue &&
                    plotItem.dataLabel.attr({
                        text: setDisplayValue
                    });
                    // draw or update label
                    valEle = chart.drawPlotLineLabel(plot, dataOptions, i, xPos, yPos);

                    // draw line
                    if (lastYPos !== null) {
                        // move to the starting position of the line segment
                        linePath = [M, lastXPos, COMMA, lastYPos];

                        // Draw line to end position
                        linePath.push(L, xPos, COMMA, yPos);

                        setLineElem = plotItem.connector;

                        setLineElem && setLineElem.attr({
                            path: linePath,
                            'stroke-width': seriesLineWidth
                        });

                    }
                    else {

                        plotItem.connector && plotItem.connector.attr({
                            path: nullLinePath,
                            'stroke-width': 0
                        });
                    }

                    lastXPos = xPos;
                    lastYPos = yPos;
                    setColor = set.color;
                    setDashStyle = set.dashStyle || dataOptions.dashStyle;
                }

            }

            return plot;
        },

        updatePlotArea: function(plot, dataOptions, RTOptions) {
            var chart = this,
                paper = chart.paper,
                options = chart.options,
                chartOptions = options.chart,
                logic = chart.logic,
                seriesOptions = options.plotOptions.series,
                plotItems = plot.items,
                datasetGraphics = plot.graphics || (plot.graphics = []),
                plotItem,

                xAxis = chart.xAxis[dataOptions.xAxis || 0],
                yAxis = chart.yAxis[dataOptions.yAxis || 0],

                isReverse = yAxis.axisData.reversed,

                // is stacked chart
                isStacked = logic.isStacked,

                // tooltip options
                tooltipOptions = options.tooltip || {},
                isTooltip = tooltipOptions.enabled !== false,

                // Directly Accessing chart definition JSON Data
                chartAttributes = chart.definition.chart,
                // decides whether a separate line over area will be drawn and
                // area boder will be hidden
                isOnlyLineBorder = chartAttributes.drawfullareaborder === '0',

                data = plot.data,

                seriesVisibility = dataOptions.visible === false ?
                        'hidden': 'visible',
                i,
                ln = data.length,


                connectNullData = seriesOptions.connectNullData,
                set,
                setLink,
                setDisplayValue,
                toolText,
                x,
                y,
                previousY,
                previousYPos,
                yMax = yAxis.max,
                yMin = yAxis.min,
                yBase = yMax > 0 && yMin > 0 ? !isReverse ? yMin : yMax :
                (yMax < 0 && yMin < 0 ? !isReverse ? yMax : yMin : !isReverse ? 0 : yMax),
                yBasePos = yAxis.getAxisPosition(yBase),

                optimalYPos,
                lastXPos,
                lastYPos = null,
                xPos,
                yPos,

                lineWidth = dataOptions.lineWidth,
                dashStyle = dataOptions.dashStyle,
                lineColor = toRaphaelColor(dataOptions.lineColor),

                // This variable stores number of datapoints joined by the area
                // A valid area required minimum of 2 data points
                validPointsJoined = 0,

                anchor,
                anchorRadius,
                trackerRadius,
                anchorLineWidth,
                anchorFillColor,
                anchorLineColor,
                // Hover settings
                setRolloverProperties,
                setRolloutAttr,
                setRolloverAttr,

                symbol,
                anchorElement,
                areaPath = [],
                areaReversePath = [],

                linePath = [],

                layers = chart.layers,
                datasetLayer = layers.dataset = layers.dataset ||
                        paper.group('dataset-orphan'),
                trackerLayer = layers.tracker,

                group,
                lineGroup,
                anchorGroup,
                lineShadowGroup,
                anchorShadowGroup,
                lineGroupParent,
                anchorShadow,
                areaGroup,
                shadowGroup,

                valEle,
                k,
                numUpdate,
                eventArgs,
                imageUrl,
                isImage,
                imgRef,
                clickHandler,
                hoverRollOver,
                hoverRollOut,
                imageOnLoad,
                imageOnErrorHandler;

            yAxis.yBasePos = yBasePos;
            clickHandler = function (data) {
                var ele = this;
                plotEventHandler.call(ele, chart, data);
            };

            hoverRollOver = function (plotItem) {
                return function (data) {
                    chart.hoverPlotAnchor(this, data, ROLLOVER, plotItem, chart);
                };
            };
            hoverRollOut = function (plotItem) {
                return function (data) {
                    chart.hoverPlotAnchor(this, data, ROLLOUT, plotItem, chart);
                };
            };
            imageOnLoad = function(x, y, marker, plotItem,
                    eventArgs, toolText, setRollover, i, setLink) {
                return function() {
                    var imgRef = this,
                        url = marker.imageUrl,
                        scale = marker.imageScale,
                        alpha = marker.imageAlpha,
                        hoverAlpha = setRollover.imageHoverAlpha,
                        hoverScale = setRollover.imageHoverScale,
                        imgW = imgRef.width * scale * 0.01,
                        hotW = (imgRef.width * hoverScale * 0.01),
                        trackerAttr;

                    setRolloutAttr = {
                        x: x - imgRef.width * scale * 0.005,
                        y: y - imgRef.height * scale * 0.005,
                        width: imgW,
                        height: imgRef.height * scale * 0.01,
                        alpha: alpha
                    };

                    setRolloverAttr = {
                        x: x - imgRef.width * hoverScale * 0.005,
                        y: y - imgRef.height * hoverScale * 0.005,
                        width: hotW,
                        height: imgRef.height * hoverScale * 0.01,
                        alpha: hoverAlpha
                    };

                    trackerAttr = (hotW > imgW) ?
                        setRolloverAttr : setRolloutAttr;

                    plotItem.graphic && plotItem.graphic
                    .attr(setRolloutAttr)
                    .attr('src', url)
                    .css({
                        opacity: alpha * 0.01
                    })
                    .data('alwaysInvisible', scale === 0)
                    .data('setRolloverProperties', setRollover)
                    .data('setRolloverAttr', setRolloverAttr)
                    .data('setRolloutAttr', setRolloutAttr)
                    .data('anchorRadius', scale)
                    .data('anchorHoverRadius', hoverScale);


                    if (setLink || isTooltip || setRollover) {
                        plotItem.tracker
                        .attr(trackerAttr)
                        .attr({
                            cursor: setLink ? 'pointer' : '',
                            stroke: TRACKER_FILL,
                            'stroke-width': marker.lineWidth,
                            fill: TRACKER_FILL,
                            ishot: true,
                            visibility: seriesVisibility
                        })
                        .data('eventArgs', eventArgs);

                        chart.drawTracker &&
                            chart.drawTracker.call(chart,
                            plot, dataOptions, i);
                    }
                    valEle = plotItem.dataLabel =
                        chart.drawPlotLineLabel(plot,
                    dataOptions, i, x, y);
                    valEle && datasetGraphics.push(valEle);
                };
            };
            imageOnErrorHandler = function(x, y, marker,
                plotItem, eventArgs, toolText, setRollover, i) {
                // Handle if image load error
                return function() {
                    valEle = plotItem.dataLabel =
                        chart.drawPlotLineLabel(plot,
                            dataOptions, i, x, y);
                    valEle && datasetGraphics.push(valEle);
                };
            };

            //create series group
            group = datasetLayer;
            if (isStacked) {
                shadowGroup = group.shadows || (group.shadows = paper.group('shadows', group).toBack());
            }
            lineGroupParent = group.line || (group.line = paper.group('line-connector', group));
            lineShadowGroup = plot.lineShadowLayer ||
                    (plot.lineShadowLayer = paper.group('connector-shadow', lineGroupParent));
            anchorShadowGroup = plot.anchorShadowLayer ||
                    (plot.anchorShadowLayer = paper.group('anchor-shadow', lineGroupParent));
            lineGroup = plot.lineLayer ||
                    (plot.lineLayer = paper.group('connector', lineGroupParent));
            anchorGroup = plot.anchorLayer ||
                    (plot.anchorLayer = paper.group('anchors', lineGroupParent));


            // Recycle elements that are supposed to go out of chart canvas
            // iterate number of updates
            numUpdate = RTOptions.numUpdate || 0;
            if (numUpdate) {
                for (i = 0; i < numUpdate; i += 1) {
                    // remove element from beginning and add it to the end
                    plotItem = plotItems.shift();

                    // delete any state related data stored in the plotItem.
                    plotItem && delete plotItem._state;

                    plotItems.push(plotItem);
                }
            }

            //draw anchor, area (and line when drawfullareaborder = 0)
            for (i = 0; i < ln; i += 1) {
                k = i + numUpdate;
                set = data[i];
                y = set.y;
                x = pluckNumber(set.x, i);
                xPos = xAxis.getAxisPosition(x);

                toolText = set.toolText;
                setLink = set.link;
                setDisplayValue = set.displayValue || BLANKSTRING;

                anchor = set.marker || {};
                anchorRadius = trackerRadius = anchor.radius || 0;
                anchorShadow = anchor.shadow;
                anchorLineWidth = anchor.lineWidth || 0;
                anchorFillColor = anchor.fillColor || '';
                anchorLineColor = anchor.lineColor || '';
                imageUrl = anchor.imageUrl;
                isImage = !!imageUrl;
                plotItem = plotItems[i];

                // for new data:
                // create new elements only if the elements do not exist
                // or update existing elements
                if (k >= ln) {
                    if (!plotItem){
                        plotItem = plotItems[i] = {
                            index: i,
                            graphic: null,
                            connector: null,
                            dataLabel: null,
                            tracker: null
                        };
                    }

                    if ((plotItem.graphic && plotItem.graphic.type === 'image' &&
                            !isImage)) {
                        plotItem.graphic && plotItem.graphic.remove();
                        plotItem.tracker && plotItem.tracker.remove();
                        plotItem.graphic = plotItem.tracker = null;
                    }
                    //add attributes that will never update during movement
                    if (!plotItem.graphic) {
                        plotItem.graphic =  (isImage ? paper.image(anchorGroup)
                            : paper.polypath(anchorGroup)).attr({
                                'visibility': seriesVisibility
                            });

                        datasetGraphics.push(plotItem.graphic);
                    }
                    if (!isImage) {
                        plotItem.graphic.attr({
                            fill: toRaphaelColor(anchorFillColor),
                            'stroke-width': anchorLineWidth,
                            stroke: toRaphaelColor(anchorLineColor)
                        });
                    }
                    //if no tracker then create it with all static attribites
                    if (!plotItem.tracker) {
                        plotItem.tracker = (isImage ? paper.rect(trackerLayer) :
                            paper.circle(trackerLayer)).attr({
                            stroke: TRACKER_FILL,
                            'fill': TRACKER_FILL,
                            'visibility': seriesVisibility
                        });
                        datasetGraphics.push(plotItem.tracker);
                    }

                    trackerRadius = mathMax (trackerRadius,
                    setRolloverProperties && setRolloverProperties.radius || 0,
                        chartOptions.anchorTrackingRadius);

                    eventArgs = {
                        index: i,
                        link: setLink,
                        value: set.y,
                        displayValue: set.displayValue,
                        categoryLabel: set.categoryLabel,
                        toolText: set.toolText,
                        id: plot.userID,
                        datasetIndex: plot.index,
                        datasetName: plot.name,
                        visible: plot.visible
                    };

                    if (plotItem._attrHoverInFn) {
                        plotItem.tracker.unhover(plotItem._attrHoverInFn, plotItem._attrHoverOutFn);
                    }
                    if (plotItem._attrClickFn) {
                        plotItem.tracker.unclick(plotItem._attrClickFn);
                    }

                    // unregister click,hover events since this might be a reused element
                    // but if this element was originally created from drawPlot functions
                    // the events will not be de-registered
                    plotItem.tracker.attr({
                        r: trackerRadius,
                        'stroke-width': anchorLineWidth,
                        'cursor': setLink ? 'pointer' : '',
                        ishot: true
                    })
                    .data('eventArgs', eventArgs)
                    .click((plotItem._attrClickFn = clickHandler))
                    .hover((plotItem._attrHoverInFn = hoverRollOver(plotItem)),
                        (plotItem._attrHoverOutFn = hoverRollOut(plotItem)))
                    .tooltip(toolText);
                }

                plotItem && (plotItem.index  = i);

                // null value
                if (y === null) {

                    if (plotItem) {
                        plotItem.graphic && plotItem.graphic.attr({
                                polypath: [2, 0, 0, 0, 0, 0],
                                'stroke-width': 0

                            });

                        plotItem.dataLabel && plotItem.dataLabel.attr({
                                text: ''
                            });

                        plotItem.tracker && plotItem.tracker.attr({
                                r: 0,
                                'stroke-width': 0
                            });

                    }

                    if (connectNullData === 0) {
                        lastYPos = null;

                        if (validPointsJoined > 0) {
                            if (validPointsJoined === 1)    {
                                areaPath.splice(-8, 8);
                            }
                            else {
                                areaPath = areaPath.concat(areaReversePath);
                                areaPath.push(Z);
                            }

                            areaReversePath = [];

                        }

                    }
                }
                // valid value
                else {
                    setLink = set.link;

                    previousY = set.previousY;
                    previousYPos = yAxis.getAxisPosition(previousY) || null;
                    optimalYPos = previousYPos || yBasePos;

                    yPos = yAxis.getAxisPosition(y + (previousY || 0));

                    if (anchor && anchor.enabled) {
                        symbol = anchor.symbol.split('_');
                        anchorElement = plotItem.graphic;

                        // Hover consmetics
                        setRolloutAttr = setRolloverAttr = {};
                        setRolloverProperties = set.rolloverProperties;
                        if (isImage && anchorElement) {

                            if (k >= ln) { // New image data
                                imgRef = new win.Image();
                                imgRef.onload = imageOnLoad(xPos, yPos, anchor, plotItem, eventArgs,
                                    toolText, setRolloverProperties, i, setLink);

                                imgRef.onerror = imageOnErrorHandler(xPos, yPos, anchor, plotItem, eventArgs,
                                        toolText, setRolloverProperties, i);
                                imgRef.src = imageUrl;
                            } else {
                                setRolloverAttr = anchorElement.data('setRolloverAttr');
                                setRolloutAttr = anchorElement.data('setRolloutAttr');
                                anchorElement && anchorElement.stop();
                                plotItem.dataLabel && plotItem.dataLabel.stop();
                                if (setRolloverAttr) {
                                    setRolloverAttr.x = xPos - setRolloverAttr.width * 0.5;
                                    setRolloverAttr.y = yPos - setRolloverAttr.height * 0.5;

                                    setRolloutAttr.x = xPos - setRolloutAttr.width * 0.5;
                                    setRolloutAttr.y = yPos - setRolloutAttr.height * 0.5;

                                    anchorElement.attr(setRolloutAttr);

                                    plotItem.tracker && plotItem.tracker.attr({
                                        x: setRolloutAttr.x,
                                        y: setRolloutAttr.y,
                                        fill: TRACKER_FILL
                                    });
                                }
                            }
                        } else {
                            if (setRolloverProperties) {
                                setRolloutAttr = {
                                    polypath: [symbol[1] || 2, xPos, yPos,
                                     anchorRadius, anchor.startAngle, 0],
                                    fill: toRaphaelColor(anchor.fillColor),
                                    'stroke-width': anchor.lineWidth,
                                    stroke: toRaphaelColor(anchor.lineColor)
                                };

                                setRolloverProperties = set.rolloverProperties;

                                setRolloverAttr = {
                                    polypath: [setRolloverProperties.sides || 2,
                                        xPos, yPos,
                                        setRolloverProperties.radius,
                                        setRolloverProperties.startAngle,
                                        setRolloverProperties.dip],
                                    fill: toRaphaelColor(setRolloverProperties.fillColor),
                                    'stroke-width': setRolloverProperties.lineWidth,
                                    stroke: toRaphaelColor(setRolloverProperties.lineColor)
                                };
                            }

                            anchorElement && anchorElement.attr({
                                polypath:[
                                        symbol[1] || 2,
                                        xPos,
                                        yPos,
                                        anchorRadius,
                                        anchor.startAngle,
                                        0
                                    ],
                                    'visibility': anchorRadius === 0 ? 'hidden':
                                            seriesVisibility
                                })
                            .data('isRealtime', true)
                            .data('alwaysInvisible', anchorRadius === 0)
                            .data('setRolloverProperties', setRolloverProperties)
                            .data('setRolloverAttr', setRolloverAttr)
                            .data('setRolloutAttr', setRolloutAttr)
                            .data('anchorRadius', anchorRadius)
                            .data('anchorHoverRadius', setRolloverProperties &&
                                    setRolloverProperties.radius)
                            .shadow(anchorShadow || false, anchorShadowGroup);
                            // create hot element if required
                            if (setLink || isTooltip) {

                                plotItem.tracker &&
                                    plotItem.tracker.attr({
                                        cx: xPos,
                                        cy: yPos
                                    });
                            }
                        }
                    }
                    // draw or update label
                    plotItem.dataLabel &&
                    plotItem.dataLabel.attrs.text !== setDisplayValue &&
                    plotItem.dataLabel.attr({
                        text: setDisplayValue
                    });
                    valEle = chart.drawPlotLineLabel(plot, dataOptions, i, xPos, yPos);

                    // First initial valid value or  valid value after null
                    if (lastYPos === null) {

                        // start/restart line path
                        linePath.push(M, xPos, COMMA, yPos);

                        // start area
                        // move to base position
                        areaPath.push(M, xPos, COMMA, optimalYPos);

                        // initialted count of  the number of valid points joined
                        validPointsJoined = 0;


                    }
                    else {

                        linePath.push(L, xPos, COMMA, yPos);

                    }

                    // continue drawing area path
                    areaPath.push(L, xPos, COMMA, yPos);
                    // draw reverse path for the base of staacked chart
                    areaReversePath.unshift(L, xPos, COMMA, optimalYPos);

                    // counts the number of valid points joined
                    validPointsJoined++;

                    lastXPos = xPos;
                    lastYPos = yPos;


                }

            }

            if (validPointsJoined > 0) {
                // Remove single line thickness area arising out of single value
                if (validPointsJoined === 1) {
                    areaPath.splice(-8, 8);
                }
                // Join reverse path, required mostly in stacked  chart
                else {
                    areaPath = areaPath.concat(areaReversePath);
                    areaPath.push(Z);
                }
            }

            if (!plot.graphic) {
                plot.graphic = paper.path(areaGroup)
                    .attr({
                        'stroke-dasharray': dashStyle,
                        'stroke-width': isOnlyLineBorder ? 0 : lineWidth,
                        'stroke': lineColor,
                        'stroke-linecap': 'round',
                        'stroke-linejoin': lineWidth > MAX_MITER_LINEJOIN ?
                                                        'round' : 'miter'

                    })
                    .shadow(seriesOptions.shadow && set.shadow, shadowGroup);

                datasetGraphics.push(plot.graphic);
            }

            plot.graphic.attr({
                path: areaPath
            });

            if (isOnlyLineBorder) {

                if (!plot.connector) {
                    plot.connector = paper.path(lineGroup)
                        .attr({
                            'stroke-dasharray': dashStyle,
                            'stroke-width': lineWidth,
                            'stroke': lineColor,
                            'stroke-linecap': 'round',
                            'stroke-linejoin': lineWidth > MAX_MITER_LINEJOIN ?
                                        'round' : 'miter'

                        });

                    datasetGraphics.push(plot.connector);

                }

                plot.connector.attr({
                    'path': linePath
                });

            }

            return plot;
        }

    }, renderer['renderer.cartesian']);

}, [3, 2, 0, 'sr2']]);
