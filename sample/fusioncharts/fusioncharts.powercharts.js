/**
 * @private
 * @module fusioncharts.renderer.javascript.legend-gradient
 */
FusionCharts.register('module', ['private', 'modules.renderer.js-gradientlegend', function() {


        var global = this,
            lib = global.hcLib,
            win = global.window,
            userAgent = win.navigator.userAgent,
            isIE = /msie/i.test(userAgent) && !win.opera,
            pluckNumber = lib.pluckNumber,
            COLOR_BLACK = lib.COLOR_BLACK,
            COLOR_GLASS = lib.COLOR_GLASS,
            FC_CONFIG_STRING = lib.FC_CONFIG_STRING,
            graphics = lib.graphics,
            hsbToRGB = graphics.HSBtoRGB,
            rgbToHSB = graphics.RGBtoHSB,
            rgbToHex = graphics.RGBtoHex,
            hexToRGB = graphics.HEXtoRGB,
            COMMASTRING = lib.COMMASTRING,
            BLANK = lib.BLANKSTRING,
            parseUnsafeString = lib.parseUnsafeString,
            convertColor = lib.graphics.convertColor,
            POSITION_TOP = lib.POSITION_TOP,
            POSITION_MIDDLE = lib.POSITION_MIDDLE,
            POSITION_START = lib.POSITION_START,
            POSITION_END = lib.POSITION_END,
            LEGENDPOINTERDRAGSTART = 'LegendPointerDragStart',
            LEGENDPOINTERDRAGSTOP = 'LegendPointerDragStop',
            LEGENDRANGEUPDATED = 'LegendRangeUpdated',
            getDarkColor = lib.graphics.getDarkColor,
            getLightColor = lib.graphics.getLightColor,
            pluck = lib.pluck,
            getValidValue = lib.getValidValue,
            toRaphaelColor = lib.toRaphaelColor,
            hasTouch = lib.hasTouch,
            M = 'M',
            Z = 'Z',
            L = 'L',
            NONE = 'none',
            mathRound = Math.round,
            mathMax = Math.max,
            mathMin = Math.min,
            mathAbs = Math.abs,
            PERCENTSTRING = '%',
            configureGradientLegendOptions,
            getLabelConfig,
            calcPercent,

            TRACKER_FILL = 'rgba(192,192,192,'+ (isIE ? 0.002 : 0.000001) +')', // invisible but clickable,

            /**
             * Fixes color values by appending hash wherever needed
             */
            dehashify = function(color) {
                return color && color.replace(/^#?([a-f0-9]+)/ig, '$1');
            };

        //for faster execution remove all validation
        // as this function will be called internaly

        function getTransitColor(colorArr1, colorArr2, transitOffset) {
            var R1 = colorArr1[0], G1 = colorArr1[1], B1 = colorArr1[2],
                R = R1 + ((colorArr2[0] - R1) * transitOffset),
                G = G1 + ((colorArr2[1] - G1) * transitOffset),
                B = B1 + ((colorArr2[2] - B1) * transitOffset);
            return {
                hex: (COLOR_BLACK + (R << 16 | G << 8 | B).toString(16)).slice(-6),
                rgb: [R, G, B]
            };
        }


        //sort color arr
        function sortFN(a, b) {
            return a.maxvalue - b.maxvalue;
        }

        function getExtremeColors(color) {
            var hsb = rgbToHSB(color);
            return {
                minRGB: hsbToRGB((hsb[2] = 0, hsb)),
                maxRGB: hsbToRGB((hsb[2] = 100, hsb))
            };
        }

        //ColorRange parser for gradient ColorRange
        function ColorRange(options) {

            var colorRange = options.colorRange || {},
                dataMin = options.dataMin,
                dataMax = options.dataMax,
                autoOrderLegendIcon = options.sortLegend || false,
                mapByCategory = options.mapByCategory || false,
                defaultColor = options.defaultColor,
                numberFormatter = options.numberFormatter,
                color = colorRange.color,
                colorArr = this.colorArr = [],
                range,
                valueRange,
                colorCount,
                i,
                j,
                lastLostColorIndex,
                code,
                colorObj,
                colorObj2,
                maxValue,
                minValue,
                color1,
                color2,
                baseColor,
                lastValue,
                colorLabel,
                extremeColors;

            this.mapByCategory = mapByCategory;
            // if map by percent
            if (colorRange.mapbypercent === '1') {
                //set the mapbypercent flag
                this.mapbypercent = true;
            }

            // if color range in gradient
            if (colorRange.gradient === '1' && !mapByCategory) {

                this.gradient = true;
                code = dehashify(pluck(colorRange.startcolor, colorRange.mincolor,
                    colorRange.code));

                baseColor = hexToRGB(dehashify(pluck(code, defaultColor,
                    'CCCCCC')));
                //get the scale min value
                lastValue = this.scaleMin = pluckNumber(colorRange.startvalue,
                    colorRange.minvalue, this.mapbypercent ? 0 : dataMin);
                //add the scale start color
                colorArr.push({
                    code: code,
                    maxvalue: lastValue,
                    label: parseUnsafeString(colorRange.startlabel),
                    codeRGB: hexToRGB(code)
                });

                if (color && (colorCount = color.length)) {
                    for (i = 0; i < colorCount; i += 1) {
                        colorObj = color[i];
                        code = dehashify(pluck(colorObj.color, colorObj.code));
                        maxValue = pluckNumber(colorObj.value, colorObj.maxvalue);
                        minValue = pluckNumber(colorObj.minvalue);
                        //add valid color
                        if (maxValue > lastValue) {
                            colorArr.push({
                                code: code,
                                maxvalue: maxValue,
                                userminvalue: minValue,
                                label: parseUnsafeString(pluck(colorObj.label,
                                    colorObj.displayvalue)),
                                codeRGB: hexToRGB(code)
                            });
                        }
                    }
                }

                //now sort the valid array
                colorArr.sort(sortFN);

                colorCount = colorArr.length;
                for (i = 1; i < colorCount; i += 1) {
                    colorObj = colorArr[i];
                    valueRange = colorObj.maxvalue - lastValue;
                    if (valueRange > 0) {
                        colorObj.minvalue = lastValue;
                        colorObj.range = valueRange;
                        lastValue = colorObj.maxvalue;
                    }
                    else {
                        colorArr.splice(i, 1);
                        i -= 1;
                        colorCount -= 1;
                    }
                }
                if (colorArr.length >= 2) {
                    this.scaleMax = lastValue;
                    colorArr[i - 1].label = pluck(colorRange.endlabel,
                        colorArr[i - 1].label, colorArr[i - 1].displayvalue);
                }

                //derive the last color stop in case no user-defined range is found.
                if (colorArr.length === 1) {
                    maxValue = pluckNumber(colorRange.maxvalue,
                        this.mapbypercent ? 100 : dataMax);
                    colorArr.push({
                        minvalue: lastValue,
                        maxvalue: maxValue,
                        range: maxValue - lastValue,
                        label: colorRange.endlabel
                    });
                    this.scaleMax = maxValue;
                    delete colorArr[0].code;
                }

                // Set values of start and end color in case they are not
                // defined by user or could not be derived from a default value.
                color1 = colorArr[0]; // start
                color2 = colorArr[colorArr.length - 1]; // end
                if (!color1.code || !color2.code) {
                    extremeColors = getExtremeColors(baseColor);
                    if (!color1.code) {
                        color1.codeRGB = extremeColors.minRGB;
                        color1.code = rgbToHex(extremeColors.minRGB);
                    }
                    if (!color2.code) {
                        color2.codeRGB = extremeColors.maxRGB;
                        color2.code = rgbToHex(extremeColors.maxRGB);
                    }
                }

                // For color stops that does not have a valid color defined, we
                // would need to insert a placeholder-color at that point.
                colorCount = colorArr.length;
                for (i = 1; i < colorCount; i += 1) {
                    colorObj = colorArr[i];

                    if (!colorObj.code) {
                        lastLostColorIndex = lastLostColorIndex || i;
                    }
                    else {
                        if (lastLostColorIndex) {
                            color2 = colorObj;
                            minValue = color1.maxvalue;
                            range = color2.maxvalue - minValue;
                            for (j = lastLostColorIndex; j < i; j += 1) {
                                colorObj2 = colorArr[j];
                                code = getTransitColor(color1.codeRGB,
                                    color2.codeRGB, (colorObj2.maxvalue - minValue) / range);

                                colorObj2.code = code.hex;
                                colorObj2.codeRGB = code.rgb;
                            }
                        }
                        lastLostColorIndex = null;
                        color1 = colorObj;
                    }
                }

                if (this.scaleMin === undefined || this.scaleMax === undefined) {
                    this.noValidRange = true;
                }
            }
            else { //non gradient color range

                if (color && (colorCount = color.length)) {
                    for (i = 0; i < colorCount; i += 1) {
                        colorObj = color[i];
                        code = pluck(colorObj.color, colorObj.code);
                        maxValue = pluckNumber(colorObj.maxvalue);
                        minValue = pluckNumber(colorObj.minvalue);
                        colorLabel = pluck(colorObj.label,
                            colorObj.displayvalue,
                            mapByCategory ? BLANK : (
                            numberFormatter.dataLabels(minValue) + ' - ' +
                            numberFormatter.dataLabels(maxValue)));
                        //add valid color
                        if (code && maxValue > minValue || (mapByCategory && colorLabel)) {
                            colorArr.push({
                                code: code,
                                maxvalue: maxValue,
                                minvalue: minValue,
                                label: parseUnsafeString(colorLabel),
                                labelId: colorLabel.toLowerCase()
                            });
                        }
                    }


                    if (colorArr.length) {
                        if (autoOrderLegendIcon) {//arrange the colors
                            colorArr.sort(sortFN);
                        }
                    }
                    else {
                        this.noValidRange = true;
                    }
                }
            }

        }
        ColorRange.prototype = {
            getColorObj: function(value) {
                var colorArr = this.colorArr,
                    i = this.gradient ? 1 : 0,
                    colorObj = colorArr[i],
                    lastMatchIndex,
                    transitOffset;



                //if gradient legend the get the transition color
                if (this.mapByCategory) {
                    value = parseUnsafeString(value).toLowerCase();
                    while (colorObj) {
                        if (colorObj.labelId === value) {
                            return {
                                code: colorObj.code,
                                seriesIndex: i
                            };
                        }
                        i += 1;
                        colorObj = colorArr[i];
                    }
                    //outof range value
                    return {
                        outOfRange: true
                    };
                }
                else if (this.gradient) {
                    //within range
                    //return the color code
                    if (this.scaleMin <= value && this.scaleMax >= value) {
                        while (colorObj && colorObj.maxvalue < value) {
                            i += 1;
                            colorObj = colorArr[i];
                        }
                        transitOffset = (value - colorObj.minvalue) / colorObj.range;
                        return {
                            code: getTransitColor(colorArr[i - 1].codeRGB, colorObj.codeRGB, transitOffset).hex
                        };
                    }
                    else {//outof range value
                        return {
                            outOfRange: true
                        };
                    }
                }
                else {
                    while (colorObj) {
                        if (colorObj.maxvalue > value && colorObj.minvalue <= value) {
                            return {
                                code: colorObj.code,
                                seriesIndex: i
                            };
                        }
                        if (colorObj.maxvalue === value) {
                            lastMatchIndex = i;
                        }
                        i += 1;
                        colorObj = colorArr[i];
                    }
                    //last range will include end limit
                    colorObj = colorArr[lastMatchIndex];
                    if (colorObj && colorObj.maxvalue === value) {
                        return {
                                code: colorObj.code,
                                seriesIndex: lastMatchIndex
                            };
                    }

                    //outof range value
                    return {
                        outOfRange: true
                    };
                }
            }
        };
        ColorRange.prototype.constructor = ColorRange;

        lib.colorRange = ColorRange;

        /***********************************/
        /*  gradient Legend Space manager  */
        /***********************************/

        /* helper functions */

        //scale labe creater function
        function getScaleLabel(value, isPercent) {
            if (isPercent) {
                return (mathRound(value * 100) / 100) + PERCENTSTRING;
            }
            else {
                return getValidValue(value, BLANK).toString();
            }
        }

        configureGradientLegendOptions = lib.configureGradientLegendOptions = function(hcJSON, fcJSON) {
            var legendObj = hcJSON.legend,
                fcJSONChart = fcJSON.chart;

            legendObj.legendSliderBorderWidth = pluckNumber(fcJSONChart.legendpointerborderthickness, 1);
            legendObj.legendSliderBorderColor = convertColor(pluck(fcJSONChart.legendpointerbordercolor,
                COLOR_BLACK), pluckNumber(fcJSONChart.legendpointerborderalpha, 100));
            legendObj.legendSliderWidth = pluckNumber(fcJSONChart.legendpointerwidth,
                fcJSONChart.legendpointerswidth, 12);
            //default value changed to look same in case of right position
            legendObj.legendSliderHeight = pluckNumber(fcJSONChart.legendpointerheight,
                fcJSONChart.legendpointersheight, 12);
            /** @todo ColorBoxBorder should be customizable */
            legendObj.legendColorBoxBorderColor = legendObj.borderColor;
            legendObj.legendColorBoxBorderWidth = legendObj.borderWidth;

            legendObj.legendScaleColor = convertColor(pluck(fcJSONChart.legendscalelinecolor,
                COLOR_BLACK), pluckNumber(fcJSONChart.legendscalelinealpha, 100));
            legendObj.legendScalePadding = pluckNumber(fcJSONChart.legendscalepadding, 4);
            legendObj.legendScaleLineThickness = pluckNumber(fcJSONChart.legendscalelinethickness, 1);
            legendObj.legendScaleTickDistance = pluckNumber(fcJSONChart.legendscaletickdistance, 6);
            //remove defaulr hand pointer
            legendObj.itemStyle.cursor = 'default';
            legendObj.interActivity = pluckNumber(fcJSONChart.interactivelegend, 1);
        };

        lib.placeGLegendBlockRight = function(hcJSON, fcJSON, availableWidth, availableHeight, isPointItem) {
            // configure LegendOptions
            this.configureLegendOptions(hcJSON, fcJSON.chart, true, isPointItem, availableWidth);

            //gradiend speciffic options
            configureGradientLegendOptions(hcJSON, fcJSON);

            var iapi = this,
                snapLiterals = iapi.snapLiterals || (iapi.snapLiterals = {}),
                conf = hcJSON[FC_CONFIG_STRING],
                smartLabel = iapi.smartLabel || conf.smartLabel,
                legendObj = hcJSON.legend,
                chartObj = hcJSON.chart,
                spacingRight = chartObj.spacingRight,
                smartText,
                smartSText,
                textPadding = legendObj.textPadding = 2,
                textPadding2 = textPadding * 2,
                captionPadding = legendObj.title.padding,
                captionWidth = 0,
                legendCaptionHeight = 0,
                padding = legendObj.padding,
                padding2 = 2 * padding,
                usedWidth = pluckNumber(fcJSON.chart.legendpadding, 7) +
                (legendObj.borderWidth / 2) + 1,
                colorRange = hcJSON.colorRange || {},
                colorArr = colorRange.colorArr,
                mapbypercent = colorRange.mapbypercent,
                scaleMax = colorRange.scaleMax,
                scaleMin = colorRange.scaleMin,
                scaleRange = scaleMax - scaleMin,
                legendSliderWidth = legendObj.legendSliderWidth,
                legendSliderHeight = legendObj.legendSliderHeight,
                legendSliderHalfHeight = legendSliderHeight / 2,
                legendScalePadding = legendObj.legendScalePadding,
                legendScaleTickDistance = legendObj.legendScaleTickDistance,
                style = legendObj.itemStyle || {},
                lineHeight = pluckNumber(parseInt(style.lineHeight, 10) || 12),
                textYAdjuster = lineHeight * 0.75,
                effectiveWidth = availableWidth - padding2,
                i,
                colorCount,
                colorObj,
                maxTextHeight,
                labelMaxWidth,
                allowedMaxSLWidth,
                halfLabelHeight,
                boxHeight,
                labelStartY = 0,
                labelEndY,
                labelW,
                scaleLabelStartY,
                scaleLabelEndY,
                scaleLabelW,
                labelLastIndex,
                pixelValueRatio,
                positionY,
                extraHeight,
                allowedMaxHeight,
                allowedMaxSLHeight,
                labelHalfWidth,
                scaleLabelHalfHeight,
                laxtColorObj;



            availableHeight -= padding2;//deduct the legend Box padding 2 * 6Px

            if (!colorRange.noValidRange && colorArr && (colorCount = colorArr.length) > 1) {
                labelLastIndex = colorCount - 1;

                //caption
                if (legendObj.title.text !== BLANK) {
                    smartLabel.setStyle(legendObj.title.style);
                    smartText = smartLabel.getSmartText(legendObj.title.text, effectiveWidth, mathMax(lineHeight,
                        availableHeight / 4));
                    legendObj.title.text = smartText.text;
                    captionWidth = smartText.width + padding2;
                    availableHeight -= legendCaptionHeight = smartText.height + captionPadding;
                }

                //set the style for non caption labels
                smartLabel.setStyle(style);
                lineHeight = smartLabel.lineHeight;

                effectiveWidth -= legendScaleTickDistance + legendScalePadding + legendSliderWidth;
                legendObj.colorBoxX = legendSliderWidth;

                allowedMaxSLWidth = mathMax(lineHeight, effectiveWidth / 2);
                labelMaxWidth = mathMin(effectiveWidth - allowedMaxSLWidth - 4, lineHeight);//boothside padding for text

                allowedMaxSLHeight = mathMax(lineHeight, availableHeight / 2);
                allowedMaxHeight = availableHeight / 4; //boothside padding for text

                ////////////////firstLabel///////////
                colorObj = colorArr[0];
                //create the scale label
                colorObj.scaleLabel = getScaleLabel(colorObj.maxvalue, mapbypercent);

                //calculate the space
                smartText = smartLabel.getSmartText(colorObj.label, allowedMaxHeight, labelMaxWidth);
                colorObj.label = smartText.text;
                labelW = smartText.height;
                colorObj.labelY = textYAdjuster - smartText.height / 2;

                smartSText = smartLabel.getSmartText(colorObj.scaleLabel, allowedMaxSLWidth, allowedMaxSLHeight);
                colorObj.scaleLabel = smartSText.text;
                scaleLabelStartY = smartSText.height / 2;
                scaleLabelW = smartSText.width;
                colorObj.scaleLabelY = textYAdjuster - smartSText.height / 2;

                //set the box StartX
                legendObj.colorBoxY = mathMax(scaleLabelStartY, smartText.width + textPadding2,
                    legendSliderHalfHeight) + legendCaptionHeight;

                //////////////lastLabel//////////////
                colorObj = laxtColorObj = colorArr[labelLastIndex];
                //create the scale label
                colorObj.scaleLabel = getScaleLabel(colorObj.maxvalue, mapbypercent);

                //calculate the space
                smartText = smartLabel.getSmartText(colorObj.label, allowedMaxHeight, labelMaxWidth);
                colorObj.label = smartText.text;
                labelW = mathMax(labelW, smartText.height);
                colorObj.labelY = textYAdjuster - smartText.height / 2;

                smartSText = smartLabel.getSmartText(colorObj.scaleLabel, allowedMaxSLWidth, allowedMaxSLHeight);
                colorObj.scaleLabel = smartSText.text;
                scaleLabelW = mathMax(scaleLabelW, smartSText.width);
                halfLabelHeight = smartSText.height / 2;
                maxTextHeight = mathMax(smartText.width + textPadding2, halfLabelHeight, legendSliderHalfHeight);
                colorObj.scaleLabelY = textYAdjuster - smartSText.height / 2;
                //set the box Width
                legendObj.colorBoxHeight = boxHeight = availableHeight - legendObj.colorBoxY - maxTextHeight;

                labelEndY = boxHeight;
                scaleLabelEndY = boxHeight - halfLabelHeight;

                pixelValueRatio = boxHeight / scaleRange;

                extraHeight = mathMin(labelEndY - labelStartY, scaleLabelEndY - scaleLabelStartY) - 4;
                //create scaleLabel for all colorObj
                for (i = 1; i < labelLastIndex; i += 1) {
                    colorObj = colorArr[i];
                    positionY = (colorObj.maxvalue - scaleMin) * pixelValueRatio;

                    //calculate the space
                    smartText = smartLabel.getSmartText(colorObj.label, mathMin(positionY -
                        labelStartY, labelEndY - positionY) * 2, labelMaxWidth);
                    colorObj.label = smartText.text;
                    labelW = mathMax(labelW, smartText.height);
                    colorObj.labelY = textYAdjuster - smartText.height / 2;
                    labelHalfWidth = smartText.width / 2;

                    //create the scale label
                    colorObj.scaleLabel = getScaleLabel(colorObj.maxvalue, mapbypercent);
                    //calculate the space
                    smartSText = smartLabel.getSmartText(colorObj.scaleLabel, allowedMaxSLWidth, mathMin(positionY -
                        scaleLabelStartY, scaleLabelEndY - positionY) * 2);
                    colorObj.scaleLabel = smartSText.text;
                    scaleLabelW = mathMax(scaleLabelW, smartSText.width);
                    scaleLabelHalfHeight = smartSText.height / 2;
                    colorObj.scaleLabelY = textYAdjuster - smartSText.height / 2;

                    extraHeight = mathMin(extraHeight, (positionY - mathMax(scaleLabelHalfHeight +
                        scaleLabelStartY, labelHalfWidth + labelStartY) - 4) * scaleRange / colorObj.range);

                    labelStartY = labelHalfWidth + positionY;
                    scaleLabelStartY = scaleLabelHalfHeight + positionY;

                }

                //calculate the extraSPace  for last gap
                //gradient box should be at least aprox 50 % width
                extraHeight = mathMax(mathMin(extraHeight, (mathMin(scaleLabelEndY - scaleLabelStartY,
                    labelEndY - labelStartY) - 4) * scaleRange / laxtColorObj.range, availableHeight * 0.3), 0);

                legendObj.colorBoxHeight -= extraHeight;

                //add text padding
                //default 15
                legendObj.colorBoxWidth = (labelW && labelW + textPadding2) || 15;

                //determine legend width
                legendObj.height = legendObj.totalHeight = availableHeight +
                    legendCaptionHeight + padding2 - extraHeight;

                legendObj.width = (scaleLabelW && scaleLabelW + textPadding) +
                    legendObj.colorBoxWidth + legendSliderWidth +
                    legendObj.legendScaleTickDistance + legendObj.legendScalePadding + padding2;

                //if the caption width has gretter width
                if (legendObj.width < captionWidth) {
                    legendObj.colorBoxX += (captionWidth - legendObj.width) / 2;
                    legendObj.width = captionWidth;
                }

                //NOTE: no scroll bar. worst case scale labels are not fully visible

                if (legendObj.width > availableWidth) { // for padding
                    legendObj.width = availableWidth;
                }

                //add anotation macro
                snapLiterals.legendstartx = conf.width - spacingRight - legendObj.width;
                snapLiterals.legendwidth = legendObj.width;
                snapLiterals.legendendx = snapLiterals.legendstartx + snapLiterals.legendwidth;
                snapLiterals.legendheight = legendObj.height;

                usedWidth += legendObj.width;
                hcJSON.chart.marginRight += usedWidth;
                return usedWidth;
            }
            else {
                legendObj.enabled = false;
                return 0;
            }
        };


        /** @todo create a single function to calculate the text & scale label space for all colorObj */
        lib.placeGLegendBlockBottom = function(hcJSON, fcJSON, availableWidth, availableHeight, isPointItem) {
            //configure LegendOptions
            this.configureLegendOptions(hcJSON, fcJSON.chart, false, isPointItem, availableWidth);
            //gradiend speciffic options
            configureGradientLegendOptions(hcJSON, fcJSON);

            var iapi = this,
                snapLiterals = iapi.snapLiterals || (iapi.snapLiterals = {}),
                conf = hcJSON[FC_CONFIG_STRING],
                smartLabel = iapi.smartLabel || conf.smartLabel,
                legendObj = hcJSON.legend,
                chartObj = hcJSON.chart,
                spacingBottom = chartObj.spacingBottom,
                spacingLeft = chartObj.spacingLeft,
                spacingRight = chartObj.spacingRight,
                smartText,
                smartSText,
                textPadding = legendObj.textPadding = 2,
                captionPadding = legendObj.title.padding,
                captionWidth = 0,
                legendCaptionHeight = 0,
                padding = legendObj.padding,
                padding2 = 2 * padding,
                usedHeight = pluckNumber(fcJSON.chart.legendpadding, 7) +
                (legendObj.borderWidth / 2) + 1,
                colorRange = hcJSON.colorRange || {},
                colorArr = colorRange.colorArr,
                mapbypercent = colorRange.mapbypercent,
                scaleMax = colorRange.scaleMax,
                scaleMin = colorRange.scaleMin,
                scaleRange = scaleMax - scaleMin,
                legendSliderWidth = legendObj.legendSliderWidth,
                legendSliderHeight = legendObj.legendSliderHeight,
                legendScalePadding = legendObj.legendScalePadding,
                legendScaleTickDistance = legendObj.legendScaleTickDistance,
                style = legendObj.itemStyle || {},
                lineHeight = pluckNumber(parseInt(style.lineHeight, 10) || 12),
                textYAdjuster = lineHeight * 0.75,
                effectiveHeight = availableHeight - padding2,
                i,
                colorCount,
                colorObj,
                maxTextWidth,
                labelMaxWidth,
                labelMaxWidth2,
                halfLabelWidth,
                boxWidth,
                labelStartX = 0,
                labelEndX,
                labelH,
                scaleLabelStartX,
                scaleLabelEndX,
                scaleLabelH,
                labelLastIndex,
                pixelValueRatio,
                positionX,
                extraWidth,
                allowedMaxHeight,
                allowedMaxSLHeight,
                labelHalfWidth,
                scaleLabelHalfWidth,
                lastColorObj;



            availableWidth -= padding2;//deduct the legend Box padding 2 * 6Px

            if (!colorRange.noValidRange && colorArr && (colorCount = colorArr.length) > 1) {
                labelLastIndex = colorCount - 1;

                //caption
                if (legendObj.title.text !== BLANK) {
                    smartLabel.setStyle(legendObj.title.style);
                    smartText = smartLabel.getSmartText(legendObj.title.text, availableWidth, effectiveHeight / 3);
                    legendObj.title.text = smartText.text;
                    captionWidth = smartText.width + padding2;
                    effectiveHeight -= legendCaptionHeight = smartText.height + captionPadding;
                }

                //set the style for non caption labels
                smartLabel.setStyle(style);
                lineHeight = smartLabel.lineHeight;

                effectiveHeight -= legendScaleTickDistance + legendScalePadding + legendSliderHeight;
                allowedMaxSLHeight = mathMax(lineHeight, effectiveHeight / 2);
                //boothside padding for text
                allowedMaxHeight = mathMin(effectiveHeight - allowedMaxSLHeight - 4, lineHeight);

                ////////////////firstLabel///////////
                labelMaxWidth = availableWidth / 4;
                labelMaxWidth2 = labelMaxWidth * 2;

                colorObj = colorArr[0];
                //create the scale label
                colorObj.scaleLabel = getScaleLabel(colorObj.maxvalue, mapbypercent);

                //calculate the space
                smartText = smartLabel.getSmartText(colorObj.label, labelMaxWidth, allowedMaxHeight);
                colorObj.label = smartText.text;
                //labelStartX = smartLabel.width / 2;
                labelH = smartText.height;
                colorObj.labelY = textYAdjuster - smartText.height / 2;

                smartSText = smartLabel.getSmartText(colorObj.scaleLabel, labelMaxWidth2, allowedMaxSLHeight);
                colorObj.scaleLabel = smartSText.text;
                scaleLabelStartX = smartSText.width / 2;
                scaleLabelH = smartSText.height;

                if (!colorObj.code) {
                    colorObj.code = pluck(legendObj.minColor, 'CCCCCC');
                }

                //set the box StartX
                legendObj.colorBoxX = mathMax(scaleLabelStartX, smartText.width + textPadding, legendSliderWidth);

                //distribute extraSpace
                //labelMaxWidth = availableWidth - maxTextWidth;

                //////////////lastLabel//////////////
                colorObj = lastColorObj = colorArr[labelLastIndex];
                //create the scale label
                colorObj.scaleLabel = getScaleLabel(colorObj.maxvalue, mapbypercent);

                //calculate the space
                smartText = smartLabel.getSmartText(colorObj.label, labelMaxWidth, allowedMaxHeight);
                colorObj.label = smartText.text;
                labelH = mathMax(labelH, smartText.height);
                colorObj.labelY = textYAdjuster - smartText.height / 2;

                smartSText = smartLabel.getSmartText(colorObj.scaleLabel, labelMaxWidth2, allowedMaxSLHeight);
                colorObj.scaleLabel = smartSText.text;
                scaleLabelH = mathMax(scaleLabelH, smartSText.height);
                halfLabelWidth = smartSText.width / 2;
                maxTextWidth = mathMax(smartText.width + textPadding, halfLabelWidth, legendSliderWidth);
                //set the box Width
                legendObj.colorBoxWidth = boxWidth = availableWidth - legendObj.colorBoxX - maxTextWidth;

                labelEndX = boxWidth;
                scaleLabelEndX = boxWidth - halfLabelWidth;

                pixelValueRatio = boxWidth / scaleRange;

                extraWidth = mathMin(labelEndX - labelStartX, scaleLabelEndX - scaleLabelStartX) - 4;
                //create scaleLabel for all colorObj
                for (i = 1; i < labelLastIndex; i += 1) {
                    colorObj = colorArr[i];
                    positionX = (colorObj.maxvalue - scaleMin) * pixelValueRatio;

                    //calculate the space
                    smartText = smartLabel.getSmartText(colorObj.label, mathMin(positionX -
                        labelStartX, labelEndX - positionX) * 2, allowedMaxHeight);
                    colorObj.label = smartText.text;
                    labelH = mathMax(labelH, smartText.height);
                    colorObj.labelY = textYAdjuster - smartText.height / 2;
                    labelHalfWidth = smartText.width / 2;

                    //create the scale label
                    colorObj.scaleLabel = getScaleLabel(colorObj.maxvalue, mapbypercent);
                    //calculate the space
                    smartSText = smartLabel.getSmartText(colorObj.scaleLabel, mathMin(positionX -
                        scaleLabelStartX, scaleLabelEndX - positionX) * 2, allowedMaxSLHeight);
                    colorObj.scaleLabel = smartSText.text;
                    scaleLabelH = mathMax(scaleLabelH, smartSText.height);
                    scaleLabelHalfWidth = smartSText.width / 2;

                    extraWidth = mathMin(extraWidth, (positionX - mathMax(scaleLabelHalfWidth +
                        scaleLabelStartX, labelHalfWidth + labelStartX) - 4) * scaleRange / colorObj.range);

                    labelStartX = labelHalfWidth + positionX;
                    scaleLabelStartX = scaleLabelHalfWidth + positionX;

                }

                //calculate the extraSPace  for last gap
                //gradient box should be at least aprox 50 % width
                extraWidth = mathMax(mathMin(extraWidth, (mathMin(scaleLabelEndX - scaleLabelStartX,
                    labelEndX - labelStartX) - 4) * scaleRange / lastColorObj.range, availableWidth * 0.3), 0);

                legendObj.colorBoxWidth -= extraWidth;

                //determine legend width
                legendObj.width = availableWidth + padding2 - extraWidth;
                //if the caption width has gretter width
                if (legendObj.width < captionWidth) {
                    legendObj.colorBoxX += (captionWidth - legendObj.width) / 2;
                    legendObj.width = captionWidth;
                }

                legendObj.colorBoxY = legendCaptionHeight + legendSliderHeight;
                //add text padding
                //default 15
                legendObj.colorBoxHeight = (labelH && labelH + (2 * textPadding)) || 15;

                legendObj.height = legendObj.totalHeight = (scaleLabelH && scaleLabelH + textPadding) +
                    legendObj.colorBoxHeight + legendCaptionHeight + legendSliderHeight +
                    legendObj.legendScaleTickDistance + legendObj.legendScalePadding + padding2;

                //NOTE: no scroll bar. worst case scale labels are not fully visible

                if (legendObj.height > availableHeight) { // for padding
                    legendObj.height = availableHeight;
                }

                //add anotation macro
                snapLiterals.legendstartx = spacingLeft + ((conf.width - spacingLeft - spacingRight -
                        legendObj.width) * 0.5) + (legendObj.x || 0);
                snapLiterals.legendwidth = legendObj.width;
                snapLiterals.legendendx = snapLiterals.legendstartx  + snapLiterals.legendwidth;
                snapLiterals.legendstarty = conf.height - spacingBottom - legendObj.height;
                snapLiterals.legendheight = legendObj.height;
                snapLiterals.legendendy = snapLiterals.legendstarty  + snapLiterals.legendheight;


                usedHeight += legendObj.height;
                hcJSON.chart.marginBottom += usedHeight;
                return usedHeight;
            }
            else {
                legendObj.enabled = false;
                return 0;
            }
        };




        /******************************/
        /*       Gradient Legend      */
        /******************************/

        //helper function
        getLabelConfig = function() {
            return {
                point: this
            };
        };
        calcPercent = function(num) {
            return mathRound(num * 100) / 100;
        };



        lib.rendererRoot.drawGradientLegendItem = function(legend) {
            var chart = this,
                paper = chart.paper,
                options = chart.options,
                // legend = this,
                plotLeft = chart.canvasLeft,
                plotTop = chart.canvasTop,
                plotWidth = chart.canvasWidth,
                plotHeight = chart.canvasHeight,
                colorRange = options.colorRange,
                colorArr, i, ln, colorObj,
                //conf = legend.conf,
                legendOptions = options.legend,
                padding = pluckNumber(legendOptions.padding, 4),
                //renderer = legend.renderer,
                itemStyle = legendOptions.itemStyle,
                symbolStyle = legendOptions.symbolStyle,
                interActivity = legendOptions.interActivity,
                elements = legend.elements,
                elementGroup = elements.elementGroup.trackTooltip(true),
                isVertical = legendOptions.layout === 'vertical',
                itemX, itemY, min, max, range,
                itemX1, itemY1,
                itemValuePercent, lastPosition = 0,
                lighting3d = legendOptions.lighting3d,
                glassW = legendOptions.colorBoxWidth,
                glassH = legendOptions.colorBoxHeight,
                boxX = legendOptions.colorBoxX,
                boxY = legendOptions.colorBoxY,
                boxW = glassW,
                boxH = glassH,
                sTW, // sliderTrackerWidth
                sTH, // sliderTrackerHeight

                //allItems = legend.allItems,
                boxFill = {
                FCcolor: {
                    color: BLANK,
                    alpha: BLANK,
                    angle: 0,
                    ratio: BLANK
                }
            },
            FCcolor = boxFill.FCcolor,
                startX = boxX + padding,
                startY = boxY + padding,
                scaleTextX, scaleTextY, labelTextX, labelTextY, scaleY, scaleX1, scaleY1,
                colorBoxBorderCOlor = legendOptions.legendColorBoxBorderColor,
                colorBoxBorderWidth = legendOptions.legendColorBoxBorderWidth,
                textPadding = 2,
                scalePath = [M],
                legendScaleColor = legendOptions.legendScaleColor,
                legendScalePadding = legendOptions.legendScalePadding,
                legendScaleLineThickness = legendOptions.legendScaleLineThickness,
                scaleCrispAdjuster = (legendScaleLineThickness % 2) / 2,
                legendScaleTickDistance = legendOptions.legendScaleTickDistance,
                legendSliderWidth = legendOptions.legendSliderWidth,
                legendSliderHeight = legendOptions.legendSliderHeight,
                heightHalf = boxH / 2,
                widthHalf = boxW / 2,
                sliderWidthHalf = legendSliderWidth / 2,
                sliderHeightHalf = legendSliderHeight / 2,
                sliderPath, sliderEffectPath,
                x1, x2, x3, x4, x5, x6, x7, y1, y2, y3, y4, y5, y6, y7,
                labelPosition, lastIndex, scaleX,
                rotation = 0,
                sliderX, sliderY, sliderW, sliderH,
                sliderColor = 'ABABAB', //should be given by user
                sliderAlpha = 100, //should be given by user
                sliderFillColorShade1 = getLightColor(sliderColor, 50),
                sliderFillColorShade2 = getDarkColor(sliderColor, 70),
                sliderFill = convertColor(sliderColor, sliderAlpha), /*{
                 FCcolor : {
                 color : sliderFillColorShade1 + COMMASTRING + sliderFillColorShade2 +
                 COMMASTRING + sliderFillColorShade2 + COMMASTRING + sliderFillColorShade1,
                 alpha : sliderAlpha + COMMASTRING + sliderAlpha + COMMASTRING +
                 sliderAlpha + COMMASTRING + sliderAlpha,
                 ratio : '0,45,10,45',
                 angle : 0
                 }
                 },*/
                sliderBorderColor = convertColor(sliderFillColorShade2, sliderAlpha),
                sliderEffectColor = convertColor(sliderFillColorShade1, sliderAlpha),
                sliderBorderWidth = 1, //should be given by user
                sliderCrispAdjuster = (sliderBorderWidth % 2) / 2,
                //variables required during drag
                sliderDragging,
                sliderDragStart,
                sliderDragEnd,
                sliderDragged,
                tooltext,
                conf1 = {
                isFirst: true
            },
            conf2 = {},
                scaleStart, scaleEnd,
                colorBox,
                scaleIsUpdating;

            //if valid colorRange
            if (colorRange && (colorArr = colorRange.colorArr) && (ln = colorArr.length) > 1) {

                conf1.toolText = scaleStart = min = colorRange.scaleMin;
                conf2.toolText = scaleEnd = max = colorRange.scaleMax;
                range = max - min;
                //slider conf
                conf1.snapPX = conf2.snapPX = 0;
                //slider conf for tooltip
                conf1.tooltipConstraint = conf2.tooltipConstraint = 'chart';
                conf1.getLabelConfig = conf2.getLabelConfig = getLabelConfig;
                conf1.tooltipPos = [0, 0];
                conf2.tooltipPos = [0, 0];

                conf2.tooltipOffsetReference = conf1.tooltipOffsetReference = {};
                conf2.tooltipOffsetReference.left =
                    conf1.tooltipOffsetReference.left += plotLeft - 20;
                conf2.tooltipOffsetReference.top =
                    conf1.tooltipOffsetReference.top += plotTop;

                colorBox = elements.colorBox = paper.group('colorBox', elementGroup);

                if (!isVertical) {//legend on bottom

                    conf1.tooltipPos[1] = conf2.tooltipPos[1] = plotHeight + plotTop;


                    x1 = mathRound(startX - sliderWidthHalf) + sliderCrispAdjuster;
                    x2 = mathRound(startX + sliderWidthHalf) + sliderCrispAdjuster;
                    y1 = mathRound(startY - legendSliderHeight) + sliderCrispAdjuster;
                    y2 = mathRound(startY + boxH) + sliderCrispAdjuster;
                    x3 = mathRound(startX - 2) + sliderCrispAdjuster;
                    x4 = mathRound(startX + 2) + sliderCrispAdjuster;
                    x5 = mathRound(startX) + sliderCrispAdjuster;
                    y3 = mathRound(startY) + sliderCrispAdjuster;
                    y4 = startY - sliderHeightHalf / 2;
                    y5 = mathRound(y4 - sliderHeightHalf) + sliderCrispAdjuster;
                    y4 = mathRound(y4) + sliderCrispAdjuster;
                    x6 = startX - sliderWidthHalf / 2;
                    x7 = mathRound(x6 + sliderWidthHalf) + sliderCrispAdjuster;
                    x6 = mathRound(x6) + sliderCrispAdjuster;


                    sliderX = x1;
                    sliderY = y1;
                    sliderW = legendSliderWidth;
                    sliderH = legendSliderHeight;

                    glassH = glassH / 2;

                    sliderPath = [M, x1, y1, L, x2, y1, x2, y3, x4, y3,
                        x5, y2, x3, y3, x1, y3, Z, M, x6, y5, L, x6, y4, M, x5, y5, L,
                        x5, y4, M, x7, y5, L, x7, y4];
                    sliderEffectPath = [M, x1, y1 + 1, L, x2, y1 + 1, M, x6 - 1, y5, L, x6 - 1, y4, M, x5 - 1, y5,
                        L, x5 - 1, y4, M, x7 - 1, y5, L, x7 - 1, y4];

                    //sliderPath = renderer.crispLine(sliderPath, legendSliderBorderWidth);
                    //s2TransX = boxW;
                    //s2TransY = 0;

                    scaleY = startY + boxH + legendScalePadding;
                    scaleY1 = mathRound(scaleY + legendScaleTickDistance) + scaleCrispAdjuster;
                    scaleY = mathRound(scaleY) + scaleCrispAdjuster;
                    scaleTextY = scaleY1;
                    labelTextY = startY + heightHalf;//text gutter
                    lastIndex = ln - 1;
                    for (i = 0; i < ln; i += 1) {
                        colorObj = colorArr[i];
                        itemValuePercent = (colorObj.maxvalue - min) / range;
                        itemX = (boxW * itemValuePercent) + startX;
                        scaleX = mathRound(itemX) + scaleCrispAdjuster;
                        if (i) {
                            FCcolor.ratio += COMMASTRING;
                            FCcolor.color += COMMASTRING;
                            FCcolor.alpha += COMMASTRING;
                            scalePath.push(L, scaleX, scaleY, scaleX, scaleY1, M, scaleX, scaleY);
                            if (i === lastIndex) {
                                labelPosition = POSITION_START;
                                itemX1 = itemX + textPadding;
                            }
                            else {
                                labelPosition = POSITION_MIDDLE;
                                itemX1 = itemX;
                            }
                        }
                        else {
                            scalePath.push(scaleX, scaleY, L, scaleX, scaleY1, M, scaleX, scaleY);
                            labelPosition = POSITION_END;
                            itemX1 = itemX - textPadding;
                        }

                        //create the color
                        FCcolor.ratio += ((itemValuePercent - lastPosition) * 100);
                        FCcolor.color += pluck(colorObj.code, COLOR_BLACK);
                        FCcolor.alpha += pluck(colorObj.alpha, 100);
                        lastPosition = itemValuePercent;

                        //Display Label
                        colorObj.legendItem = paper.text(elementGroup)
                            .attr({
                            text: colorObj.label,
                            x: itemX1,
                            y: labelTextY,
                            'text-anchor': labelPosition,
                            'vertical-align': POSITION_MIDDLE
                        })
                            .css(itemStyle);

                        //scale Label
                        colorObj.legendSymbol = paper.text(elementGroup)
                            .attr({
                            text: colorObj.scaleLabel,
                            x: itemX,
                            y: scaleTextY,
                            'text-anchor': POSITION_MIDDLE,
                            'vertical-align': POSITION_TOP
                        }).css(itemStyle);
                        //allItems.push(colorObj);
                    }
                    //slider conf
                    conf1.xMin = conf2.xMin = 0;
                    conf1.xMax = conf2.xMax = boxW;
                    conf1.yMin = conf2.yMin = 0;
                    conf1.yMax = conf2.yMax = 0;
                    conf1.y = conf2.y = 0;
                    conf1.x = 0;
                    conf2.x = boxW;
                    sTW = legendSliderWidth;
                    sTH = legendSliderHeight + boxH;

                }
                else {
                    conf1.tooltipPos[0] = conf2.tooltipPos[0] = plotWidth + plotLeft;

                    rotation = 270;
                    FCcolor.angle = 90;
                    x1 = startX - legendSliderWidth;
                    x2 = startX + boxW;
                    y1 = startY - sliderHeightHalf;
                    y2 = startY + sliderHeightHalf;



                    x1 = mathRound(startX - legendSliderWidth) + sliderCrispAdjuster;
                    x2 = mathRound(startX) + sliderCrispAdjuster;
                    y1 = mathRound(startY - sliderHeightHalf) + sliderCrispAdjuster;
                    y2 = mathRound(startY + sliderHeightHalf) + sliderCrispAdjuster;
                    x3 = mathRound(startX + boxW) + sliderCrispAdjuster;
                    y3 = mathRound(startY - 2) + sliderCrispAdjuster;
                    y4 = mathRound(startY + 2) + sliderCrispAdjuster;
                    y5 = mathRound(startY) + sliderCrispAdjuster;
                    x4 = startX - sliderWidthHalf / 2;
                    x5 = mathRound(x4 - sliderHeightHalf) + sliderCrispAdjuster;
                    x4 = mathRound(x4) + sliderCrispAdjuster;
                    y6 = startY - sliderHeightHalf / 2;
                    y7 = mathRound(y6 + sliderHeightHalf) + sliderCrispAdjuster;
                    y6 = mathRound(y6) + sliderCrispAdjuster;



                    glassW = glassW / 2;

                    sliderPath = [M, x1, y1, L, x2, y1, x2, y3, x3, y5,
                        x2, y4, x2, y2, x1, y2, Z, M, x5, y6, L, x4, y6, M, x5, y5, L,
                        x4, y5, M, x5, y7, L, x4, y7];
                    sliderEffectPath = [M, x1 + 1, y1, L, x1 + 1, y2, M, x5, y6 - 1, L,
                        x4, y6 - 1, M, x5, y5 - 1, L, x4, y5 - 1, M, x5, y7 - 1, L, x4, y7 - 1];

                    scaleX = startX + boxW + legendScalePadding;
                    scaleX1 = mathRound(scaleX + legendScaleTickDistance) + scaleCrispAdjuster;
                    scaleX = mathRound(scaleX) + scaleCrispAdjuster;
                    scaleTextX = scaleX1;
                    labelTextX = startX + widthHalf;//text gutter
                    lastIndex = ln - 1;
                    for (i = 0; i < ln; i += 1) {
                        colorObj = colorArr[i];
                        itemValuePercent = (colorObj.maxvalue - min) / range;
                        itemY = (boxH * itemValuePercent) + startY;
                        scaleY = mathRound(itemY) + scaleCrispAdjuster;
                        if (i) {
                            FCcolor.ratio += COMMASTRING;
                            FCcolor.color += COMMASTRING;
                            FCcolor.alpha += COMMASTRING;
                            scalePath.push(L, scaleX, scaleY, scaleX1, scaleY, M, scaleX, scaleY);
                            if (i === lastIndex) {
                                labelPosition = POSITION_END;
                                itemY1 = itemY + textPadding;
                            }
                            else {
                                labelPosition = POSITION_MIDDLE;
                                itemY1 = itemY;
                            }
                        }
                        else {
                            scalePath.push(scaleX, scaleY, L, scaleX1, scaleY, M, scaleX, scaleY);
                            labelPosition = POSITION_START;
                            itemY1 = itemY - textPadding;
                        }

                        //create the color
                        FCcolor.ratio += ((itemValuePercent - lastPosition) * 100);
                        FCcolor.color += pluck(colorObj.code, COLOR_BLACK);
                        FCcolor.alpha += pluck(colorObj.alpha, 100);
                        lastPosition = itemValuePercent;

                        //Display Label
                        colorObj.legendItem = paper.text(elementGroup)
                            .attr({
                            text: colorObj.label,
                            x: labelTextX,
                            y: itemY1,
                            'text-anchor': labelPosition,
                            'vertical-align': POSITION_MIDDLE
                        })
                            .rotate(rotation, labelTextX, itemY1)
                            .css(itemStyle);

                        //scale Label
                        colorObj.legendSymbol = paper.text(elementGroup)
                            .attr({
                            text: colorObj.scaleLabel,
                            x: scaleTextX,
                            y: itemY,
                            'text-anchor': POSITION_START,
                            'vertical-align': POSITION_MIDDLE
                        }).css(itemStyle);
                    }
                    //slider conf
                    conf1.xMin = conf2.xMin = 0;
                    conf1.xMax = conf2.xMax = 0;
                    conf1.yMin = conf2.yMin = 0;
                    conf1.yMax = conf2.yMax = boxH;
                    conf1.x = conf2.x = 0;
                    conf1.y = 0;
                    conf2.y = boxH;

                    sTW = legendSliderHeight + boxW;
                    sTH = legendSliderWidth;
                }


                //create the colorBOx
                elements.colorBox = paper.rect(colorBox)
                    .attr({
                    x: startX,
                    y: startY,
                    width: boxW,
                    height: boxH,
                    fill: toRaphaelColor(boxFill),
                    stroke: colorBoxBorderCOlor,
                    strokeWidth: colorBoxBorderWidth
                });

                //Create the glass effect
                if (lighting3d) {
                    elements.colorBoxEffect = paper.rect(colorBox)
                        .attr({
                        x: startX,
                        y: startY,
                        width: glassW,
                        height: glassH,
                        fill: COLOR_GLASS,
                        'stroke-width': 0
                    });
                }

                //create the Scale
                elements.scale = paper.path(elementGroup)
                    .attr({
                    path: scalePath,
                    stroke: legendScaleColor,
                    'stroke-width': legendScaleLineThickness
                });

                //various handler
                sliderDragged = function(xChange, yChange, dx, dy, isSlider1) {
                    var newScaleLimit,
                        tooltext;
                    if (!isVertical) {
                        newScaleLimit = (xChange * range / boxW) + min;
                        dx = xChange > 0 ? dx : (dx + xChange + 0.01);
                    }
                    else {
                        newScaleLimit = (yChange * range / boxH) + min;
                        dy = yChange > 0 ? dy : (dy + yChange + 0.01);
                    }
                    tooltext = calcPercent(newScaleLimit);


                    if (isSlider1) {
                        elements.slider1.translate(dx, dy);
                        elements.slider1Effect.translate(dx, dy);
                        elements.slider1Tracker.toFront()
                            .translate(dx, dy).tooltip(tooltext, null, null, true);
                        scaleStart = newScaleLimit;
                    } else {
                        elements.slider2.translate(dx, dy);
                        elements.slider2Effect.translate(dx, dy);
                        elements.slider2Tracker.toFront()
                            .translate(dx, dy).tooltip(tooltext, null, null, true);
                        scaleEnd = newScaleLimit;
                    }

                    if (interActivity) {
                        //update series
                        scaleIsUpdating = clearTimeout(scaleIsUpdating);
                        scaleIsUpdating = setTimeout(function() {
                            if (chart.setScaleRange) {
                                chart.setScaleRange(scaleStart, scaleEnd);
                            }
                        }, 100);
                    }
                };

                sliderDragging = function(dx, dy) {
                    var config = this,
                        xChange = 0,
                        yChange = xChange,
                        doDrag,
                        isFirst = config.isFirst,
                        otherConf = isFirst? conf2 : conf1;

                    if (!isVertical) {
                        xChange = config._startX + dx;
                        if (xChange <= 0) {
                            xChange = 0;
                        }
                        if (xChange > boxW) {
                            xChange = boxW;
                        }
                        if (isFirst ? xChange > otherConf.x : xChange < otherConf.x) {
                            xChange = otherConf.x;
                        }
                        if (mathAbs(xChange - config.x) >= (config.snapPX || 0)) {
                            doDrag = true;
                        }
                    }
                    else {
                        yChange = config._startY + dy;
                        if (yChange <= 0) {
                            yChange = 0;
                        }
                        if (yChange > boxH) {
                            yChange = boxH;
                        }
                        if (isFirst ? yChange > otherConf.y : yChange < otherConf.y) {
                            yChange = otherConf.y;
                        }
                        if (mathAbs(yChange - config.y) >= (config.snapPX || 0)) {
                            doDrag = true;
                        }
                    }
                    if (doDrag) {
                        sliderDragged(xChange, yChange, xChange - config.x, yChange - config.y, isFirst);
                        config.x = xChange;
                        config.y = yChange;
                    }
                };

                sliderDragStart = function() {
                    var config = this,
                        isFirst = config.isFirst;

                    config._startX = config.x;
                    config._startY = config.y;
                    config._scaleStart = scaleStart;
                    config._scaleEnd = scaleEnd;
                    /**
                     * This event is fired when the legend denotes a gradient legend. For heatmap chart and maps.
                     * This is event is fired when the legend pointer drag is started.
                     *
                     * @event FusionCharts#legendPointerDragStart
                     * @group legend
                     *
                     * @param {number} pointerIndex Indicates whether the index is 0 or 1.
                     * @param {object} pointers It is an object containing the scale start value and scale end value.
                     * @param {number} legendPointerHeight It is the legend pointer height in pixels or percent.
                     * @param {number} legendPointerWidth It is the legend pointer width in pixels or percent.
                     */
                    global.raiseEvent(LEGENDPOINTERDRAGSTART, {
                        pointerIndex: isFirst ? 0 : 1,
                        pointers: [{value: scaleStart},{value: scaleEnd}],
                        legendPointerHeight: legendSliderHeight,
                        legendPointerWidth: legendSliderWidth
                    }, chart.logic.chartInstance);
                };

                sliderDragEnd = function() {
                    var config = this,
                        isFirst = config.isFirst,
                        prevStart = config._scaleStart,
                        prevEnd = config._scaleEnd;
                    /**
                     * This event is fired when the legend Pointer Drag is stopped.
                     *
                     * @event FusionCharts#legendPointerDragStop
                     * @group legend
                     *
                     * @param {number} pointerIndex Indicates whether the index is 0 or 1.
                     * @param {object} pointers Its an object containing the scale start value and the scale end value.
                     * @param {number} legendPointerHeight It is the legend pointer height in pixels or percentage.
                     * @param {number} legendPointerWidth It is the legend pointer width in pixels or percentage.
                     */
                    global.raiseEvent(LEGENDPOINTERDRAGSTOP, {
                        pointerIndex: isFirst ? 0 : 1,
                        pointers: [{value: scaleStart},{value: scaleEnd}],
                        legendPointerHeight: legendSliderHeight,
                        legendPointerWidth: legendSliderWidth
                    }, chart.logic.chartInstance);

                    // If there has any change in scale then only rais LegendRangedUpdated event
                    if (prevStart !== scaleStart || prevEnd !== scaleEnd) {
                        /**
                         * This is event is fired if there is any change in scale.
                         *
                         * @event FusionCharts#legendRangeUpdated
                         * @group legend
                         *
                         * @param {number} previousMinValue Indicates the previous minimum value.
                         * @param {number} previousMaxValue Indicates the previous maximum value.
                         * @param {number} minValue Indicates the scale start value.
                         * @param {number} maxValue Indicates the scale end value.
                         */
                        global.raiseEvent(LEGENDRANGEUPDATED, {
                            previousMinValue: prevStart,
                            previousMaxValue: prevEnd,
                            minValue: scaleStart,
                            maxValue: scaleEnd
                        }, chart.logic.chartInstance);
                    }
                    delete config._scaleStart;
                    delete config._scaleEnd;
                };

                tooltext = calcPercent(min);
                //create the sliders
                elements.slider1 = paper.path(elementGroup)
                    .attr({
                    path: sliderPath,
                    fill: sliderFill,
                    strokeWidth: sliderBorderWidth,
                    stroke: sliderBorderColor
                });
                elements.slider1Effect = paper.path(elementGroup)
                    .attr({
                    path: sliderEffectPath,
                    fill: NONE,
                    strokeWidth: sliderBorderWidth,
                    stroke: sliderEffectColor
                });

                // Increase tracker width and height for touch devices
                if (hasTouch) {
                    x1 -= (mathMax(30, sTW) - sTW) * 0.5;
                    y1 -= (mathMax(40, sTH) - sTH) * 0.5;
                    sTW = mathMax(30, sTW);
                    sTH = mathMax(40, sTH);
                }

                elements.slider1Tracker = paper.rect(elementGroup).attr({
                    ishot: true,
                    width: sTW,
                    height: sTH,
                    x: x1,
                    y: y1,
                    fill: TRACKER_FILL,
                    stroke: NONE
                })
                .drag(sliderDragging, sliderDragStart, sliderDragEnd, conf1, conf1, conf1)
                .tooltip(tooltext, null, null, true)
                .css(symbolStyle);

                tooltext = calcPercent(max);
                elements.slider2 = paper.path(elementGroup).attr({
                    path: sliderPath,
                    fill: sliderFill,
                    strokeWidth: sliderBorderWidth,
                    stroke: sliderBorderColor
                })
                .translate(conf2.x, conf2.y);

                elements.slider2Effect = paper.path(elementGroup).attr({
                    path: sliderEffectPath,
                    fill: NONE,
                    strokeWidth: sliderBorderWidth,
                    stroke: sliderEffectColor
                }).translate(conf2.x, conf2.y);

                elements.slider2Tracker = paper.rect(elementGroup).attr({
                    ishot: true,
                    width: sTW,
                    height: sTH,
                    x: x1,
                    y: y1,
                    fill: TRACKER_FILL,
                    stroke: NONE
                }).translate(conf2.x, conf2.y)
                .css(symbolStyle)
                .drag(sliderDragging, sliderDragStart, sliderDragEnd, conf2, conf2, conf2)
                .tooltip(tooltext, null, null, true);

            }
        };
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
 * @module fusioncharts.renderer.javascript.powercharts
 * @requires fusioncharts.renderer.javascript.legend-gradient
 *
 * @export fusioncharts.powercharts.js
 */
FusionCharts.register('module', ['private', 'modules.renderer.js-powercharts',
    function() {
        var global = this,
            lib = global.hcLib,
            R = lib.Raphael,
            window = global.window,
            win = window,
            doc = win.document,
            //strings
            BLANK = lib.BLANKSTRING,
            createTrendLine = lib.createTrendLine,
            parseTooltext = lib.parseTooltext,
            //add the tools thats are requared
            pluck = lib.pluck,
            getValidValue = lib.getValidValue,
            pluckNumber = lib.pluckNumber,
            getFirstValue = lib.getFirstValue,
            getDefinedColor = lib.getDefinedColor,
            parseUnsafeString = lib.parseUnsafeString,
            CONFIGKEY = lib.FC_CONFIG_STRING,
            extend2 = lib.extend2, //old: jarendererExtend / margecolone
            getDashStyle = lib.getDashStyle, // returns dashed style of a line series
            toRaphaelColor = lib.toRaphaelColor,
            toPrecision = lib.toPrecision,
            hasSVG = lib.hasSVG,
            createContextMenu = lib.createContextMenu,
            isIE = lib.isIE,
            dropHash = lib.regex.dropHash,
            HASHSTRING = lib.HASHSTRING,
            UNDEFINED,
            ROLLOVER = 'DataPlotRollOver',
            ROLLOUT = 'DataPlotRollOut',
            extend = function(a, b) { /** @todo refactor dependency */
                var n;
                if (!a) {
                    a = {};
                }
                for (n in b) {
                    a[n] = b[n];
                }
                return a;
            },
            each = lib.each,
            addEvent = lib.addEvent,
            removeEvent = lib.removeEvent,
            getTouchEvent = lib.getTouchEvent,
            defined = function(obj) {
                return obj !== UNDEFINED && obj !== null;
            },
            pInt = function(s, mag) {
                return parseInt(s, mag || 10);
            },

            OBJECTBOUNDINGBOX = 'objectBoundingBox', // gradient unit
            ROUND = 'round',
            DRAGSTART = 'dragstart',
            DRAGEND = 'dragend',
            docMode8 = window.document.documentMode === 8,
            TRACKER_FILL = 'rgba(192,192,192,' + (isIE ? 0.002 : 0.000001) + ')', // invisible but clickable
            TOUCH_THRESHOLD_PIXELS = lib.TOUCH_THRESHOLD_PIXELS,
            CLICK_THRESHOLD_PIXELS = lib.CLICK_THRESHOLD_PIXELS,
            HIDDEN = 'hidden',
            VISIBLE = docMode8 ? 'visible' : '',
            AXISSHIFTED = 'AxisShifted',
            OBJECTSTRING = 'object',
            keyTestReg = /^_/,
            CRISP = 'crisp',
            PX = 'px',
            NONE = 'none',
            M = 'M',
            L = 'L',
            H = 'H',
            V = 'V',
            A = 'A',
            Z = 'Z',
            COMMA = ',',
            ZERO = '0',
            ONE = '1',
            HUNDRED = '100',
            BGRATIOSTRING = lib.BGRATIOSTRING,
            math = Math,
            mathSin = math.sin,
            mathCos = math.cos,
            mathRound = math.round,
            mathMin = math.min,
            mathMax = math.max,
            mathAbs = math.abs,
            mathPI = math.PI,
            mathCeil = math.ceil,
            mathFloor = math.floor,
            mathSqrt = math.sqrt,
            mathPow = math.pow,
            deg2rad = mathPI / 180,
            pi2 = 2 * mathPI,
            hasTouch = lib.hasTouch,
            // hot/tracker threshold in pixels
            HTP = hasTouch ? TOUCH_THRESHOLD_PIXELS :
                CLICK_THRESHOLD_PIXELS,
            getColumnColor = lib.graphics.getColumnColor,
            getFirstColor = lib.getFirstColor,
            setLineHeight = lib.setLineHeight,
            pluckFontSize = lib.pluckFontSize, // To get the valid font size (filters negative values)
            pluckColor = lib.pluckColor,
            getFirstAlpha = lib.getFirstAlpha,
            getDarkColor = lib.graphics.getDarkColor,
            getLightColor = lib.graphics.getLightColor,
            convertColor = lib.graphics.convertColor,
            COLOR_TRANSPARENT = lib.COLOR_TRANSPARENT,
            POSITION_CENTER = lib.POSITION_CENTER,
            POSITION_TOP = lib.POSITION_TOP,
            POSITION_BOTTOM = lib.POSITION_BOTTOM,
            POSITION_RIGHT = lib.POSITION_RIGHT,
            POSITION_LEFT = lib.POSITION_LEFT,
            POSITION_MIDDLE = 'middle',
            POSITION_START = 'start',
            POSITION_END = 'end',
            AXISSELECTED = 'AxisSelected',
            bindSelectionEvent = lib.bindSelectionEvent,
            GUTTER_4 = 4,
            GUTTER_2 = 2,
            t = 't',
            INT_ZERO = 0,
            chartAPI = lib.chartAPI,
            renderer = chartAPI,
            mapSymbolName = lib.graphics.mapSymbolName,
            singleSeriesAPI = chartAPI.singleseries,
            COMMASTRING = lib.COMMASTRING,
            ZEROSTRING = lib.ZEROSTRING,
            HUNDREDSTRING = lib.HUNDREDSTRING,
            COMMASPACE = lib.COMMASPACE,
            getMouseCoordinate = lib.getMouseCoordinate,
            creditLabel = false && !/fusioncharts\.com$/i.test(window.location.hostname),
            plotEventHandler = lib.plotEventHandler,
            xssEncode = global.xssEncode,

            //strings
            BLANKSPACE = ' ',

            //add the tools thats are requared
            SHAPE_RECT = lib.SHAPE_RECT,
            deltend = lib.deltend,

            libGraphics = lib.graphics,
            parseColor = libGraphics.parseColor,
            getValidColor = libGraphics.getValidColor,


            placeHorizontalAxis = lib.placeHorizontalAxis,
            placeVerticalAxis = lib.placeVerticalAxis,
            stepYAxisNames = lib.stepYAxisNames,

            adjustHorizontalCanvasMargin = lib.adjustHorizontalCanvasMargin,
            adjustVerticalCanvasMargin = lib.adjustVerticalCanvasMargin,

            getDataParser = lib.getDataParser,

            LABEL = 'label',
            INPUT = 'input',
            OPTIONSTR = '<option>',
            OPTIONCLOSESTR = '</option>',
            stubEvent = {
                pageX: 0,
                pageY: 0
            },

            DECIMALS = 100000000,
            dragExtension,
            BoxAndWhiskerStatisticalCalc,
            ConnectorClass,
            dragChartsComponents,
            CLEAR_TIME_1000 = 1000,
            clearLongPress = function() {
                var ele = this;
                ele.data('move', false);
                clearTimeout(ele._longpressactive);
                delete ele._longpressactive;
            },
            createElement = lib.createElement,
            getArcPath = function(cX, cY, startX, startY, endX, endY, rX, rY, isClockWise, isLargeArc) {
                return [A, rX, rY, 0, isLargeArc, isClockWise, endX, endY];
            };

        // Adding FC_ChartUpdated event to eventList
        // for dragCharts
        lib.eventList.chartupdated = 'FC_ChartUpdated';
        lib.eventList.dataposted = 'FC_DataPosted';
        lib.eventList.dataposterror = 'FC_DataPostError';
        lib.eventList.datarestored = 'FC_DataRestored';

        global.addEventListener('rendered', function(event) {
            var chartObj = event.sender,
                state = chartObj.__state,
                iapi = chartObj.jsVars && chartObj.jsVars.instanceAPI;

            if (!state.listenersAdded && iapi && typeof iapi.getCollatedData === 'function') {
                chartObj.addEventListener(['chartupdated', 'dataupdated', 'rendered'], function(event) {
                    delete event.sender.__state.hasStaleData;
                });
                state.listenersAdded = true;
            }
        });

        /* Spline Charts */
        /*chartAPI('spline', {
        standaloneInit: true,
        creditLabel : creditLabel,
        defaultSeriesType : 'spline'
    }, chartAPI.linebase);*/
        chartAPI('spline', {
            friendlyName: 'Spline Chart',
            standaloneInit: true,
            creditLabel: creditLabel,
            defaultSeriesType: 'spline',
            rendererId: 'spline'
        }, chartAPI.linebase);

        chartAPI('splinearea', {
            friendlyName: 'Spline Area Chart',
            standaloneInit: true,
            creditLabel: creditLabel,
            defaultSeriesType: 'areaspline',
            anchorAlpha: '100',
            rendererId: 'spline'
        }, chartAPI.area2dbase);

        chartAPI('msspline', {
            friendlyName: 'Multi-series Spline Chart',
            standaloneInit: true,
            creditLabel: creditLabel,
            defaultSeriesType: 'spline',
            rendererId: 'spline'
        }, chartAPI.mslinebase);

        chartAPI('mssplinedy', {
            friendlyName: 'Multi-series Dual Y-Axis Spline Chart',
            standaloneInit: true,
            creditLabel: creditLabel,
            isDual: true,
            series: chartAPI.mscombibase.series,
            secondarySeriesType: 'spline',
            secondarySeriesFilter: {
                spline: true
            },
            defaultSeriesFilter: {
                spline: true
            }
        }, chartAPI.msspline);

        chartAPI('mssplinearea', {
            friendlyName: 'Multi-series Spline Area Chart',
            standaloneInit: true,
            creditLabel: creditLabel,
            defaultSeriesType: 'areaspline',
            rendererId: 'spline'
        }, chartAPI.msareabase);

        chartAPI('msstepline', {
            friendlyName: 'Multi-series Step Line Chart',
            standaloneInit: true,
            creditLabel: creditLabel,
            defaultSeriesType: 'line',
            rendererId: 'cartesian',
            stepLine: true
        }, chartAPI.mslinebase);

        /* Inverse Charts */
        chartAPI('inversemsline', {
            friendlyName: 'Inverted Y-Axis Multi-series Line Chart',
            standaloneInit: true,
            creditLabel: creditLabel,
            inversed: true,
            rendererId: 'cartesian'
        }, chartAPI.mslinebase);

        chartAPI('inversemsarea', {
            friendlyName: 'Inverted Y-Axis Multi-series Area Chart',
            standaloneInit: true,
            creditLabel: creditLabel,
            inversed: true,
            rendererId: 'cartesian'
        }, chartAPI.msareabase);

        chartAPI('inversemscolumn2d', {
            friendlyName: 'Inverted Y-Axis Multi-series Column Chart',
            standaloneInit: true,
            creditLabel: creditLabel,
            inversed: true,
            rendererId: 'cartesian'
        }, chartAPI.mscolumn2dbase);

        // Log chart vizualization logic data structure. Log charts are essentially
        // inherited from their corresponding linear charts and their axis is updated
        // to plot log data in linear mapping.
        chartAPI('logmsline', {
            friendlyName: 'Multi-series Log Line Chart',
            standaloneInit: true,

            // Log charts cannot have negative values.
            isValueAbs: true,
            // Mark this as log axis for the axis and other rendering tweaks within
            isLog: true,
            configureAxis: chartAPI.logbase.configureAxis,
            pointValueWatcher: chartAPI.logbase.pointValueWatcher,
            getLogAxisLimits: chartAPI.logbase.getLogAxisLimits,
            creditLabel: creditLabel,
            rendererId: 'cartesian'
        }, chartAPI.mslinebase);

        // Log chart vizualization logic data structure. Log charts are essentially
        // inherited from their corresponding linear charts and their axis is updated
        // to plot log data in linear mapping.
        // Log column chart has its axes redefined in LogMSLine chart.
        chartAPI('logmscolumn2d', {
            friendlyName: 'Multi-series Log Column Chart',
            standaloneInit: true,
            isLog: true,
            isValueAbs: true,
            configureAxis: chartAPI.logbase.configureAxis,
            pointValueWatcher: chartAPI.logbase.pointValueWatcher,
            getLogAxisLimits: chartAPI.logbase.getLogAxisLimits,
            creditLabel: creditLabel,
            rendererId: 'cartesian'
        }, chartAPI.mscolumn2dbase);

        chartAPI('logstackedcolumn2d', {
            friendlyName: 'Stacked Log Column Chart',
            standaloneInit: true,
            creditLabel: creditLabel,
            isStacked: true
        }, chartAPI.logmscolumn2d);
        /////////////// ErrorBar2D ///////////
        chartAPI('errorbar2d', {
            friendlyName: 'Error Bar Chart',
            standaloneInit: true,
            creditLabel: creditLabel,
            showValues: 0,
            rendererId: 'cartesian',
            isErrorChart: true,
            fireGroupEvent: true,

            chart: function() {
                var hc = this.base.chart.apply(this, arguments),
                    drawErrorValue = this.drawErrorValue;

                if (!hc.callbacks) {
                    hc.callbacks = [];
                }
                hc.callbacks.push(function() {
                    var chart = this,
                        plots = chart.elements.plots,
                        datasets = chart.dataset || chart.options.series,
                        len = plots && plots.length;
                    while (len--) {
                        datasets[len] &&
                            drawErrorValue.call(chart, plots[len], datasets[len]);
                    }
                });

                return hc;
            },

            point: function(chartName, series, dataset, FCChartObj, HCObj,
                catLength, seriesIndex, MSStackIndex, columnPosition) {
                var iapi = this,
                    ignoreEmptyDatasets = pluckNumber(FCChartObj.ignoreemptydatasets, 0),
                    hasValidPoint = false,
                    notHalfErrorBar = !pluckNumber(FCChartObj.halferrorbar, 1),
                    data,
                    conf = HCObj[CONFIGKEY],
                    // 100% stacked chart takes absolute values only
                    isValueAbs = pluck(iapi.isValueAbs, conf.isValueAbs, false),
                    // showValues attribute in individual dataset
                    datasetShowValues = pluckNumber(dataset.showvalues,
                        conf.showValues),
                    seriesYAxis = pluckNumber(series.yAxis, 0),
                    // use3DLighting to show gradient color effect in 3D
                    // Column charts
                    use3DLighting = pluckNumber(FCChartObj.use3dlighting, 1),
                    NumberFormatter = HCObj[CONFIGKEY].numberFormatter,
                    colorM = iapi.colorManager,
                    plotGradientColor = (pluckNumber(
                            FCChartObj.useplotgradientcolor, 1) ? getDefinedColor(
                            FCChartObj.plotgradientcolor,
                            colorM.getColor('plotGradientColor')) :
                        BLANK),
                    defAlpha = pluck(dataset.alpha,
                        FCChartObj.plotfillalpha, HUNDRED),
                    errorBarAlpha = getFirstAlpha(pluck(
                        dataset.errorbaralpha, FCChartObj.errorbaralpha,
                        defAlpha)),
                    seriesDashStyle = pluckNumber(dataset.dashed,
                        FCChartObj.plotborderdashed, 0),
                    // length of the dash
                    seriesDashLen = pluckNumber(dataset.dashlen,
                        FCChartObj.plotborderdashlen, 5),
                    // distance between dash
                    seriesDashGap = pluckNumber(dataset.dashgap,
                        FCChartObj.plotborderdashgap, 4),
                    // take the series type
                    seriesType = pluck(series.type, iapi.defaultSeriesType),
                    // Check the chart is a stacked chart or not
                    isStacked = HCObj.plotOptions[seriesType] &&
                        HCObj.plotOptions[seriesType].stacking,
                    plotColor = colorM.getPlotColor(),
                    hoverEffects,

                    is3d,
                    index,
                    isBar,
                    dataObj,
                    setRatio,
                    setAngle,
                    setColor,
                    setAlpha,
                    colorArr,
                    dataLabel,
                    itemValue,
                    errorValue,
                    pointShadow,
                    errorBarShadowObj,
                    isRoundEdges,
                    errorValueArr,
                    setBorderWidth,
                    plotBorderAlpha,
                    setPlotBorderColor,
                    setPlotBorderAlpha,
                    pointStub;

                iapi.errorBarShadow = pluckNumber(FCChartObj.errorbarshadow);
                /** @todo not sure about the proper place to store this */
                series.errorBar2D = true;



                // Dataset seriesname
                series.name = getValidValue(dataset.seriesname);

                //add column position
                if (!isStacked) {
                    series.columnPosition = pluckNumber(columnPosition, MSStackIndex, seriesIndex);
                }

                // If includeInLegend set to false
                // We set series.name blank
                if (pluckNumber(dataset.includeinlegend) === 0 ||
                    defAlpha === 0 || series.name === undefined) {
                    series.showInLegend = false;
                }

                // Error Bar Attributes
                series.errorBarWidthPercent = pluckNumber(
                    dataset.errorbarwidthpercent,
                    FCChartObj.errorbarwidthpercent, 70);
                series.errorBarColor = convertColor(getFirstColor(
                    pluck(dataset.errorbarcolor, FCChartObj.errorbarcolor,
                        'AAAAAA')), errorBarAlpha);
                series.errorBarThickness = pluckNumber(
                    dataset.errorbarthickness, FCChartObj.errorbarthickness, 1);

                // Color of the individual series
                series.color = pluck(dataset.color, plotColor).split(COMMA)[0]
                    .replace(/^#?/g, '#');
                // We proceed if there is data inside dataset object
                if (data = dataset.data) {

                    // Column border thickness
                    setBorderWidth = pluck(FCChartObj.plotborderthickness,
                        ONE);
                    // whether to use round edges or not in the column
                    isRoundEdges = HCObj.chart.useRoundEdges;
                    // is3d and isBar helps to get the column color by
                    // getColumnColor function
                    // whether the chart is a 3D or Bar
                    isBar = iapi.isBar;
                    is3d = /3d$/.test(HCObj.chart.defaultSeriesType);

                    // dataplot border color
                    setPlotBorderColor = pluck(FCChartObj.plotbordercolor,
                        colorM.getColor('plotBorderColor'))
                        .split(COMMA)[0];
                    // dataplot border alpha
                    setPlotBorderAlpha = FCChartObj.showplotborder == ZERO ?
                        ZERO : pluck(FCChartObj.plotborderalpha, HUNDRED);

                    // Managing plot border color for 3D column chart
                    // 3D column chart doesn't show the plotborder by default
                    // until we set showplotborder true
                    setPlotBorderAlpha = is3d ? (FCChartObj.showplotborder ?
                        setPlotBorderAlpha : ZERO) : setPlotBorderAlpha;

                    // Default  plotBorderColor  is FFFFFF for this 3d chart
                    setPlotBorderColor = is3d ? pluck(FCChartObj.plotbordercolor,
                        '#FFFFFF') : setPlotBorderColor;

                    // Iterate through all level data
                    // We are managing the data value labels and other cosmetics
                    // inside this loop
                    for (index = 0; index < catLength; index += 1) {
                        // Individual data object
                        dataObj = data[index];
                        if (dataObj) {
                            // get the valid value
                            itemValue = NumberFormatter.getCleanValue(dataObj.value,
                                isValueAbs);
                            // get the valid value
                            errorValue = NumberFormatter.getCleanValue(
                                dataObj.errorvalue, isValueAbs);
                            if (itemValue === null) {
                                // add the data
                                series.data.push({
                                    y: null
                                });
                                continue;
                            }

                            hasValidPoint = true;
                            // Label of the data
                            dataLabel = conf.oriCatTmp[index];
                            // Individual data point color
                            setColor = pluck(dataObj.color, dataset.color, plotColor);
                            // Alpha of the data point
                            setAlpha = getFirstAlpha(pluck(dataObj.alpha, defAlpha)) + BLANK;
                            setRatio = pluck(dataObj.ratio, dataset.ratio,
                                FCChartObj.plotfillratio);
                            // defaultAngle depend upon item value
                            setAngle = pluck(360 - FCChartObj.plotfillangle, 90);
                            if (itemValue < 0) {
                                setAngle = 360 - setAngle;
                            }
                            // Used to set alpha of the shadow
                            pointShadow = {
                                opacity: setAlpha / 100
                            };
                            plotBorderAlpha = mathMin(setAlpha,
                                getFirstAlpha(setPlotBorderAlpha)) + BLANK;

                            // calculate the color object for the set
                            colorArr = getColumnColor(setColor + COMMA + plotGradientColor,
                                setAlpha, setRatio,
                                setAngle, isRoundEdges, setPlotBorderColor,
                                plotBorderAlpha, isBar, is3d);

                            errorBarShadowObj = {
                                opacity: errorBarAlpha / 250
                            };

                            pointStub = this.getPointStub(dataObj, itemValue, dataLabel, HCObj, dataset,
                                datasetShowValues, seriesYAxis, errorValue);

                            errorValueArr = [];
                            errorValueArr.push({
                                errorValue: errorValue,
                                toolText: pointStub._errortoolText,
                                shadow: errorBarShadowObj
                            });
                            notHalfErrorBar && errorValueArr.push({
                                errorValue: -errorValue,
                                toolText: pointStub._errortoolText,
                                shadow: errorBarShadowObj
                            });

                            hoverEffects = this.pointHoverOptions(dataObj, series, {
                                plotType: 'column',
                                is3d: is3d,
                                isBar: isBar,

                                use3DLighting: use3DLighting,
                                isRoundEdged: isRoundEdges,

                                color: setColor,
                                gradientColor: plotGradientColor,
                                alpha: setAlpha,
                                ratio: setRatio,
                                angle: setAngle,

                                borderWidth: setBorderWidth,
                                borderColor: setPlotBorderColor,
                                borderAlpha: plotBorderAlpha,
                                borderDashed: seriesDashStyle,
                                borderDashGap: seriesDashGap,
                                borderDashLen: seriesDashLen,

                                shadow: pointShadow
                            });
                            // add the data
                            series.data.push(extend2(pointStub, {
                                y: itemValue,
                                shadow: pointShadow,
                                //errorValue: errorValue,
                                errorValue: errorValueArr,
                                color: colorArr[0],
                                borderColor: colorArr[1],
                                borderWidth: setBorderWidth,
                                use3DLighting: use3DLighting,
                                // get per-point dash-style
                                dashStyle: pluckNumber(dataObj.dashed,
                                    seriesDashStyle) ? getDashStyle(
                                    pluck(dataObj.dashlen, seriesDashLen),
                                    pluck(dataObj.dashgap, seriesDashGap),
                                    setBorderWidth) : undefined,
                                hoverEffects: hoverEffects.enabled && hoverEffects.options,
                                rolloverProperties: hoverEffects.enabled && hoverEffects.rolloverOptions
                            }));

                            // Set the maximum and minimum found in data
                            // pointValueWatcher use to calculate the maximum and
                            // minimum value of the Axis
                            this.pointValueWatcher(HCObj, itemValue, errorValue);

                        } else {
                            // add the data
                            series.data.push({
                                y: null
                            });
                        }
                    }
                }

                if (ignoreEmptyDatasets && !hasValidPoint) {
                    series.showInLegend = false;
                }

                return series;
            },

            pointValueWatcher: function(HCObj, value, errorValue) {
                var pValue, nValue, obj, FCconf = HCObj[CONFIGKEY],
                    yAxisIndex = 0;
                if (value !== null) {
                    if (errorValue) {
                        pValue = value + errorValue;
                        nValue = value - errorValue;
                    } else {
                        pValue = nValue = value;
                    }


                    if (!FCconf[yAxisIndex]) {
                        FCconf[yAxisIndex] = {};
                    }
                    obj = FCconf[yAxisIndex];

                    obj.max = obj.max > pValue ? obj.max : pValue;
                    obj.min = obj.min < pValue ? obj.min : pValue;
                    obj.max = obj.max > nValue ? obj.max : nValue;
                    obj.min = obj.min < nValue ? obj.min : nValue;
                }
            },

            /** @todo 1. No dual y axis management for error values */
            drawErrorValue: function(plot, dataset) {
                var chart = this,
                    options = chart.options,
                    seriesOptions = options.plotOptions.series,
                    conf = options[CONFIGKEY],
                    smartLabel = chart.smartLabel || conf.smartLabel,
                    paper = chart.paper,
                    layers = chart.layers,
                    xAxis = chart.xAxis[0],
                    yAxis = chart.yAxis[0],
                    animationDuration = isNaN(+seriesOptions.animation) &&
                        seriesOptions.animation.duration ||
                        seriesOptions.animation * 1000,
                    datasetLayer = layers.dataset = layers.dataset ||
                        paper.group('dataset-orphan'),
                    errorGroup = plot.errorGroup = paper.group('errorBar')
                        .insertAfter(plot.lineLayer ||
                            datasetLayer.column || datasetLayer),
                    errorTracker = layers.errorTracker || (layers.errorTracker = paper.group('hot-error',
                        layers.tracker || datasetLayer).toBack()),
                    errorValueGroup = datasetLayer.errorValueGroup ||
                        (datasetLayer.errorValueGroup = paper.group('errorValues')),
                    isErrorBar = dataset.errorBar2D,
                    data = dataset.data || [],
                    dataLen = data.length,
                    plotItems = plot.items,
                    // tooltip options
                    tooltipOptions = options.tooltip || {},
                    isTooltip = tooltipOptions.enabled !== false,
                    set,
                    x,
                    y,
                    setLink,
                    tooltext,
                    xPos,
                    yPos,
                    datasetGraphics = plot.graphics = (plot.graphics || []),
                    seriesVisibility = dataset.visible === false ?
                        'hidden' : 'visible',
                    chartOptions = options.chart,
                    valuePadding = chartOptions.valuePadding || 0,
                    rotateValues = (chartOptions.rotateValues == 1) ? 270 : undefined,

                    columnPosition = dataset.columnPosition || 0,
                    chartAttributes = chart.definition.chart,
                    xAxisZeroPos = xAxis.getAxisPosition(0),
                    xAxisFirstPos = xAxis.getAxisPosition(1),
                    groupMaxWidth = xAxisFirstPos - xAxisZeroPos,
                    groupPadding = seriesOptions.groupPadding,
                    definedGroupPadding = chartAttributes &&
                        chartAttributes.plotspacepercent,
                    maxColWidth = seriesOptions.maxColWidth,
                    numColumns = dataset.numColumns || 1,
                    groupNetWidth = (1 - definedGroupPadding * 0.01) * groupMaxWidth || mathMin(groupMaxWidth *
                        (1 - groupPadding * 2),
                        maxColWidth * numColumns),
                    groupNetHalfWidth = groupNetWidth / 2,
                    columnWidth = groupNetWidth / numColumns,
                    xPosOffset = (columnPosition * columnWidth) - groupNetHalfWidth,
                    chartLogic = chart.logic,
                    useCrispErrorPath = !chartLogic.avoidCrispError,
                    canvasHeight = chart.canvasHeight + chart.canvasTop,
                    shadowGroup = layers.shadows || (layers.shadows =
                        paper.group('shadows', datasetLayer).toBack()),
                    smartText = {},
                    style = options.plotOptions.series.dataLabels.style,
                    chartW = chart.chartWidth,
                    chartH = chart.chartHeight,
                    css = {
                        fontFamily: style.fontFamily,
                        fontSize: style.fontSize,
                        lineHeight: style.lineHeight,
                        fontWeight: style.fontWeight,
                        fontStyle: style.fontStyle
                    },
                    graphicEle,
                    groupId,
                    crispY,
                    crispX,
                    errorPath,

                    labelTopY,
                    labelBottomY,
                    lineHeight,
                    labelY,

                    plotItem,
                    errorValPos,
                    errorValueArr,
                    errorValueObj,
                    errorValue,
                    errorStartValue,
                    errorStartPos,
                    errorDisplayValue,
                    errorLen,
                    isHorizontal,
                    errorBarWidth,
                    halfErrorBarW,
                    errorBarColor,
                    errorBarThickness,
                    errorLineElem,
                    errorTrackerElem,
                    errorValueElem,
                    errorElemClick = function(e) {
                        var ele = this;
                        plotEventHandler.call(ele, chart, e);
                    },
                    erroElemHoverFN = function(e) {
                        var ele = this;
                        plotEventHandler.call(ele, chart, e, ROLLOVER);
                    }, erroElemOutFN = function(e) {
                        var ele = this;
                        plotEventHandler.call(ele, chart, e, ROLLOUT);
                    },
                    getErrLinkClickFN = function(link) {
                        return function() {
                            (link !== undefined) &&
                                chart.linkClickFN.call({
                                    link: link
                                }, chart);
                        };
                    },
                    aimateFN = function() {
                        errorGroup.show();
                        errorValueGroup.attr({
                            transform: '...t' + -chartW + COMMA + -chartH
                        });
                        shadowGroup.show();
                    };

                // We proceed only if there is valid data.
                if (dataLen > 0) {
                    // Loop through each data points
                    while (dataLen--) {
                        set = data[dataLen];
                        y = pluckNumber(set.errorStartValue, set.y);
                        errorValueArr = set.errorValue;
                        setLink = set.link;
                        /** @todo need to get the error bar width */
                        if (y !== undefined && errorValueArr &&
                            (errorLen = errorValueArr.length)) {
                            x = pluckNumber(set.x, dataLen);
                            yPos = yAxis.getAxisPosition(y);
                            xPos = xAxis.getAxisPosition(x);

                            /**
                             * @todo the following calculation is errorBar2d specific it is best to shift them to point
                             * function. But there are limitations as several objects are not ready.
                             */
                            if (isErrorBar) {
                                //add only if xPosOffset is valid
                                xPosOffset && (xPos = xPos + xPosOffset);
                                //add only if columnWidth is valid
                                columnWidth && (xPos = xPos + columnWidth / 2);
                            }

                            plotItem = plotItems[dataLen] || (plotItems[dataLen] = {});
                            plotItem.errorBars =
                                plotItem.errorBars || [];
                            plotItem.errorValues =
                                plotItem.errorValues || [];
                            plotItem.trackerBars =
                                plotItem.trackerBars || [];
                            graphicEle = plotItem.tracker || plotItem.graphic;
                            groupId = graphicEle && graphicEle.data('groupId');

                            //Loop through errorValue array
                            while (errorLen--) {
                                errorTrackerElem = errorLineElem = errorValueElem =
                                    null;
                                errorValueObj = errorValueArr[errorLen];
                                errorStartValue = errorValueObj.errorStartValue;
                                tooltext = errorValueObj.tooltext ||
                                    errorValueObj.toolText;
                                errorStartPos = !isNaN(errorStartValue) ?
                                    yAxis.getAxisPosition(errorStartValue) : yPos;
                                errorDisplayValue = errorValueObj.displayValue;

                                errorValue = errorValueObj.errorValue;
                                if (!errorValueObj || !defined(errorValue)) {
                                    continue;
                                }
                                isHorizontal =
                                    pluckNumber(errorValueObj.isHorizontal, 0);
                                errorBarThickness =
                                    pluckNumber(errorValueObj.errorBarThickness,
                                        dataset.errorBarThickness, 1);
                                errorBarWidth = pluckNumber(columnWidth *
                                    dataset.errorBarWidthPercent / 100,
                                    errorValueObj.errorWidth, (isHorizontal ?
                                        dataset.hErrorBarWidth : dataset.vErrorBarWidth),
                                    dataset.errorBarWidth);
                                halfErrorBarW = errorBarWidth / 2;
                                errorBarColor = errorValueObj.errorBarColor ||
                                    dataset.errorBarColor;

                                if (defined(errorDisplayValue) &&
                                    errorDisplayValue !== BLANK) {
                                    errorValueElem = paper.text(errorValueGroup)
                                        .attr({
                                            text: errorDisplayValue,
                                            fill: style.color,
                                            'text-bound': [style.backgroundColor, style.borderColor,
                                                style.borderThickness, style.borderPadding,
                                                style.borderRadius, style.borderDash
                                            ]
                                        })
                                        .css(css);
                                    smartLabel.setStyle(css);
                                    smartText = smartLabel.getOriSize(errorDisplayValue);
                                }

                                // Horizontal Error Drawing
                                if (isHorizontal) {
                                    errorValPos = labelY =
                                        xAxis.getAxisPosition(x + errorValue);
                                    crispY = errorValPos;
                                    crispX = xPos;

                                    if (useCrispErrorPath) {
                                        crispY = mathRound(errorStartPos) +
                                            (errorBarThickness % 2 / 2);
                                        crispX = mathRound(errorValPos) +
                                            (errorBarThickness % 2 / 2);
                                    }

                                    errorPath = [M, xPos, crispY, H, crispX,
                                        M, crispX, crispY - halfErrorBarW,
                                        V, (crispY + halfErrorBarW)
                                    ];

                                    errorLineElem = paper.path(errorPath, errorGroup)
                                        .attr({
                                            stroke: errorBarColor,
                                            'stroke-width': errorBarThickness,
                                            'cursor': setLink ? 'pointer' : '',
                                            'stroke-linecap': 'round',
                                            'visibility': seriesVisibility
                                        })
                                        .shadow(pluckNumber(chartLogic.errorBarShadow, seriesOptions.shadow) &&
                                            errorBarThickness > 0 &&
                                            errorValueObj.shadow, shadowGroup);

                                    if ((setLink || isTooltip) &&
                                        errorBarThickness < HTP) {
                                        errorTrackerElem =
                                            paper.path(errorPath, errorTracker)
                                            .attr({
                                                stroke: TRACKER_FILL,
                                                'stroke-width': HTP,
                                                'cursor': setLink ? 'pointer' : '',
                                                'ishot': !! setLink,
                                                'visibility': seriesVisibility
                                            });
                                    }
                                }
                                // Vertical Error drawing
                                else {
                                    errorValPos = labelY =
                                        yAxis.getAxisPosition((errorStartValue || y) + errorValue);
                                    crispY = errorValPos;
                                    crispX = xPos;
                                    if (useCrispErrorPath) {
                                        crispY = mathRound(errorValPos) +
                                            (errorBarThickness % 2 / 2);
                                        crispX = mathRound(xPos) +
                                            (errorBarThickness % 2 / 2);
                                    }

                                    lineHeight = (rotateValues ? smartText.width :
                                        smartText.height) * 0.5;
                                    labelTopY = errorValPos + errorBarThickness *
                                        0.5 + valuePadding + lineHeight;
                                    labelBottomY = errorValPos - errorBarThickness * 0.5 - valuePadding - lineHeight;

                                    // Manage display value if going outside the canvas
                                    if (errorStartPos > errorValPos) {
                                        labelY = labelBottomY;
                                        if (labelBottomY - chart.canvasTop <
                                            lineHeight) {
                                            labelY = labelTopY;
                                        }
                                    } else {
                                        labelY = labelTopY;
                                        if (canvasHeight - labelTopY < lineHeight) {
                                            labelY = labelBottomY;
                                        }
                                    }

                                    errorPath = [
                                        M, crispX, errorStartPos,
                                        V, crispY,
                                        M, crispX - halfErrorBarW, crispY,
                                        H, (crispX + halfErrorBarW)
                                    ];

                                    errorLineElem = paper.path(errorPath, errorGroup)
                                        .attr({
                                            stroke: errorBarColor,
                                            'stroke-width': errorBarThickness,
                                            'cursor': setLink ? 'pointer' : '',
                                            'stroke-linecap': 'round',
                                            'visibility': seriesVisibility
                                        })
                                        .shadow(pluckNumber(chartLogic.errorBarShadow, seriesOptions.shadow) &&
                                            errorBarThickness > 0 &&
                                            errorValueObj.shadow, shadowGroup);
                                    if ((setLink || isTooltip) && errorBarThickness < HTP) {
                                        errorTrackerElem = paper.path(errorPath,
                                            errorTracker)
                                            .attr({
                                                stroke: TRACKER_FILL,
                                                'stroke-width': HTP,
                                                'cursor': setLink ? 'pointer' : '',
                                                'ishot': !! setLink,
                                                'visibility': seriesVisibility
                                            });
                                    }
                                }

                                errorTrackerElem = errorTrackerElem || errorLineElem;
                                errorTrackerElem.data('eventArgs', graphicEle && graphicEle.data('eventArgs') || {
                                    link: setLink,
                                    toolText: tooltext,
                                    displayValue: errorValueObj.displayValue,
                                    value: errorValue
                                });

                                errorTrackerElem.click(errorElemClick)
                                    .data('groupId', groupId)
                                    .hover(erroElemHoverFN, erroElemOutFN)
                                    .tooltip(tooltext);

                                (setLink || isTooltip) &&
                                    errorTrackerElem.click(getErrLinkClickFN(setLink));

                                //Error value drawing
                                if (errorValueElem) {
                                    errorValueElem
                                        .attr({
                                            x: xPos,
                                            y: labelY,
                                            title: (errorValueObj.originalText || ''),
                                            visibility: seriesVisibility
                                        })
                                        .css(css);
                                    rotateValues && errorValueElem.attr('transform',
                                        'T0,0,R' + rotateValues);
                                }

                                if (errorLineElem) {
                                    datasetGraphics.push(errorLineElem);
                                    plotItem.errorBars.push(
                                        errorLineElem);
                                }

                                if (errorValueElem) {
                                    datasetGraphics.push(errorValueElem);
                                    plotItem.errorValues.push(
                                        errorValueElem);
                                }

                                if (errorTrackerElem && errorTrackerElem !==
                                    errorLineElem) {
                                    datasetGraphics.push(errorTrackerElem);
                                    plotItem.trackerBars.push(
                                        errorTrackerElem);
                                }
                            }
                            //only if animation is defined
                            if (animationDuration) {
                                errorGroup.hide();
                                errorValueGroup.attr({
                                    transform: '...t' + chartW + COMMA + chartH
                                });
                                shadowGroup.hide();
                                setTimeout(aimateFN, animationDuration);
                            }
                        }
                    }

                    plot.visible = (dataset.visible !== false);
                }

            }
        }, chartAPI.mscolumn2dbase);

        /////////////// ErrorBar2D ///////////
        chartAPI('errorline', {
            friendlyName: 'Error Line Chart',
            standaloneInit: true,
            creditLabel: creditLabel,
            chart: chartAPI.errorbar2d.chart,
            drawErrorValue: chartAPI.errorbar2d.drawErrorValue,
            useErrorGroup: true,
            rendererId: 'cartesian',
            isErrorChart: true,
            fireGroupEvent: true,
            canvasPaddingModifiers: ['anchor', 'errorbar'],

            point: function(chartName, series, dataset, FCChartObj, HCObj,
                catLength) {
                var ignoreEmptyDatasets = pluckNumber(FCChartObj.ignoreemptydatasets, 0),
                    hasValidPoint = false,
                    notHalfErrorBar = !pluckNumber(FCChartObj.halferrorbar, 1),
                    // Data array in dataset object
                    data,
                    conf = HCObj[CONFIGKEY],
                    iapi = this,
                    // 100% stacked chart takes absolute values only
                    isValueAbs = pluck(iapi.isValueAbs, conf.isValueAbs, false),
                    // showValues attribute in individual dataset
                    datasetShowValues = pluckNumber(dataset.showvalues,
                        conf.showValues),
                    seriesYAxis = pluckNumber(series.yAxis, 0),
                    NumberFormatter = iapi.numberFormatter,
                    // Line cosmetics attributes
                    // Color of the line series
                    colorM = iapi.colorManager,
                    lineColorDef = getFirstColor(pluck(dataset.color,
                        FCChartObj.linecolor, colorM.getPlotColor())),

                    HCChartObj = HCObj.chart,
                    // Alpha of the line
                    lineAlphaDef = pluckNumber(dataset.alpha, FCChartObj.linealpha,
                        HUNDRED),
                    errorBarAlpha = pluckNumber(dataset.errorbaralpha,
                        FCChartObj.errorbaralpha, lineAlphaDef),
                    // Line Thickness
                    lineThickness = pluckNumber(dataset.linethickness,
                        FCChartObj.linethickness, 2),
                    // Whether to use dashline
                    lineDashed = Boolean(pluckNumber(dataset.dashed,
                        FCChartObj.linedashed, 0)),

                    // line dash attrs
                    lineDashLen = pluckNumber(dataset.linedashlen,
                        FCChartObj.linedashlen, 5),
                    lineDashGap = pluckNumber(dataset.linedashgap,
                        FCChartObj.linedashgap, 4),
                    hoverEffects,

                    itemValue,
                    errorValue,
                    index,
                    lineColor,
                    lineAlpha,
                    drawAnchors,
                    setAnchorAlpha,
                    setAnchorBgAlpha,
                    setAnchorBgColor,
                    setAnchorBorderColor,
                    setAnchorBorderThickness,
                    setAnchorRadius,
                    setAnchorSides,
                    dataLabel,
                    dataObj,
                    pointShadow,
                    anchorShadow,
                    setAnchorAngle,
                    setAnchorShadow,
                    setAnchorSidesDef,
                    setAnchorRadiusDef,
                    setAnchorBorderColorDef,
                    setAnchorBorderThicknessDef,
                    setAnchorBgColorDef,
                    setAnchorAlphaDef,
                    setAnchorBgAlphaDef,
                    setAnchorAngleDef,
                    pointAnchorEnabled,
                    dashStyle,
                    errorValueArr,
                    pointStub;

                iapi.errorBarShadow = pluckNumber(FCChartObj.errorbarshadow);

                // Dataset seriesname
                series.name = getValidValue(dataset.seriesname);

                // Set the line color and alpha to
                // HC seris obj with FusionCharts color format using FCcolor obj
                series.color = {
                    FCcolor: {
                        color: lineColorDef,
                        alpha: lineAlphaDef
                    }
                };

                // Set the line thickness (line width)
                series.lineWidth = lineThickness;
                // Managing line series markers
                // Whether to drow the Anchor or not
                drawAnchors = pluckNumber(dataset.drawanchors,
                    dataset.showanchors, FCChartObj.drawanchors,
                    FCChartObj.showanchors);

                // Anchor cosmetics
                // We first look into dataset then chart obj and then
                // default value.
                setAnchorSidesDef = pluckNumber(dataset.anchorsides,
                    FCChartObj.anchorsides, 0);
                setAnchorRadiusDef = pluckNumber(dataset.anchorradius,
                    FCChartObj.anchorradius, 3);
                setAnchorBorderColorDef = getFirstColor(pluck(
                    dataset.anchorbordercolor, FCChartObj.anchorbordercolor,
                    lineColorDef));
                setAnchorBorderThicknessDef = pluckNumber(
                    dataset.anchorborderthickness,
                    FCChartObj.anchorborderthickness, 1);
                setAnchorBgColorDef = getFirstColor(pluck(
                    dataset.anchorbgcolor, FCChartObj.anchorbgcolor,
                    colorM.getColor('anchorBgColor')));
                setAnchorAlphaDef = pluck(dataset.anchoralpha,
                    FCChartObj.anchoralpha, HUNDRED);
                setAnchorBgAlphaDef = pluck(dataset.anchorbgalpha,
                    FCChartObj.anchorbgalpha, setAnchorAlphaDef);
                setAnchorAngleDef = pluckNumber(dataset.anchorstartangle,
                    FCChartObj.anchorstartangle, 90);

                // anchor shadow
                anchorShadow = series.anchorShadow = pluckNumber(FCChartObj.anchorshadow, 0);

                // Error Bar Attributes
                series.errorBarWidth = pluckNumber(FCChartObj.errorbarwidth,
                    dataset.errorbarwidth, 5);
                series.errorBarColor = convertColor(getFirstColor(pluck(
                        dataset.errorbarcolor, FCChartObj.errorbarcolor, 'AAAAAA')),
                    errorBarAlpha);
                series.errorBarThickness = mathMin(lineThickness,
                    pluckNumber(dataset.errorbarthickness,
                        FCChartObj.errorbarthickness, 1));


                // If includeInLegend set to false
                // We set series.name blank
                if (pluckNumber(dataset.includeinlegend) === 0 ||
                    series.name === undefined || (lineAlphaDef === 0 &&
                        drawAnchors !== 1)) {
                    series.showInLegend = false;
                }

                //set the marker attr at series
                series.marker = {
                    fillColor: {
                        FCcolor: {
                            color: setAnchorBgColorDef,
                            alpha: ((setAnchorBgAlphaDef * setAnchorAlphaDef) /
                                100) + BLANK
                        }
                    },
                    lineColor: {
                        FCcolor: {
                            color: setAnchorBorderColorDef,
                            alpha: setAnchorAlphaDef + BLANK
                        }
                    },
                    lineWidth: setAnchorBorderThicknessDef,
                    radius: setAnchorRadiusDef,
                    symbol: mapSymbolName(setAnchorSidesDef),
                    startAngle: setAnchorAngleDef
                };


                if (data = dataset.data) {



                    // Iterate through all level data
                    for (index = 0; index < catLength; index += 1) {
                        // Individual data obj
                        // for further manipulation
                        dataObj = data[index];
                        if (dataObj) {
                            itemValue = NumberFormatter.getCleanValue(dataObj.value,
                                isValueAbs);
                            errorValue = NumberFormatter.getCleanValue(
                                dataObj.errorvalue, isValueAbs);

                            if (itemValue === null) {
                                // add the data
                                series.data.push({
                                    y: null
                                });
                                continue;
                            }

                            hasValidPoint = true;

                            // Anchor cosmetics in data points
                            // Getting anchor cosmetics for the data points or
                            // its default values
                            setAnchorSides = pluckNumber(dataObj.anchorsides,
                                setAnchorSidesDef);
                            setAnchorRadius = pluckNumber(dataObj.anchorradius,
                                setAnchorRadiusDef);
                            setAnchorBorderColor = getFirstColor(pluck(
                                dataObj.anchorbordercolor,
                                setAnchorBorderColorDef));
                            setAnchorBorderThickness = pluckNumber(
                                dataObj.anchorborderthickness,
                                setAnchorBorderThicknessDef);
                            setAnchorBgColor = getFirstColor(pluck(
                                dataObj.anchorbgcolor, setAnchorBgColorDef));
                            setAnchorAlpha = pluck(dataObj.anchoralpha,
                                setAnchorAlphaDef);
                            setAnchorBgAlpha = pluck(dataObj.anchorbgalpha,
                                setAnchorBgAlphaDef);

                            // Managing line series cosmetics
                            // Color of the line
                            lineColor = getFirstColor(pluck(dataObj.color,
                                lineColorDef));

                            // alpha
                            lineAlpha = pluck(dataObj.alpha, lineAlphaDef);

                            // Create line dash
                            // Using dashStyle of HC
                            dashStyle = pluckNumber(dataObj.dashed, lineDashed) ?
                                getDashStyle(lineDashLen, lineDashGap, lineThickness) :
                                undefined;

                            // Used to set alpha of the shadow
                            pointShadow = {
                                opacity: lineAlpha / 100
                            };
                            pointAnchorEnabled = drawAnchors === undefined ?
                                lineAlpha !== 0 : !! drawAnchors;

                            // Label of the data
                            dataLabel = conf.oriCatTmp[index];

                            pointStub = iapi.getPointStub(dataObj, itemValue, dataLabel, HCObj, dataset,
                                datasetShowValues, seriesYAxis, errorValue);

                            errorValueArr = [];
                            errorValueArr.push({
                                errorValue: errorValue,
                                toolText: pointStub._errortoolText,
                                shadow: {
                                    opacity: errorBarAlpha / 250
                                }
                            });
                            notHalfErrorBar && errorValueArr.push({
                                errorValue: errorValue === null ? null : -errorValue,
                                toolText: pointStub._errortoolText,
                                shadow: {
                                    opacity: errorBarAlpha / 250
                                }
                            });

                            setAnchorAngle = pluck(dataObj.anchorstartangle,
                                setAnchorAngleDef);
                            setAnchorShadow = Boolean(pluckNumber(dataObj.anchorshadow,
                                anchorShadow, 0));
                            // Point hover effects
                            hoverEffects = iapi.pointHoverOptions(dataObj, series, {
                                plotType: 'anchor',

                                anchorBgColor: setAnchorBgColor,
                                anchorAlpha: setAnchorAlpha,
                                anchorBgAlpha: setAnchorBgAlpha,
                                anchorAngle: setAnchorAngle,

                                anchorBorderThickness: setAnchorBorderThickness,
                                anchorBorderColor: setAnchorBorderColor,
                                anchorBorderAlpha: setAnchorAlpha,
                                anchorSides: setAnchorSides,
                                anchorRadius: setAnchorRadius,

                                shadow: pointShadow
                            });

                            // Finally add the data
                            // we call getPointStub function that manage
                            // displayValue, toolText and link
                            series.data.push(extend2(pointStub, {
                                y: itemValue,
                                shadow: pointShadow,
                                dashStyle: dashStyle,
                                errorValue: errorValueArr,
                                valuePosition: pluck(dataObj.valueposition,
                                    HCChartObj.valuePosition),
                                color: {
                                    FCcolor: {
                                        color: lineColor,
                                        alpha: lineAlpha
                                    }
                                },
                                marker: {
                                    enabled: pointAnchorEnabled,
                                    shadow: setAnchorShadow && {
                                        opacity: setAnchorAlpha / 100
                                    },
                                    fillColor: {
                                        FCcolor: {
                                            color: setAnchorBgColor,
                                            alpha: (setAnchorBgAlpha *
                                                setAnchorAlpha / 100) + BLANK
                                        }
                                    },
                                    lineColor: {
                                        FCcolor: {
                                            color: setAnchorBorderColor,
                                            alpha: setAnchorAlpha
                                        }
                                    },
                                    lineWidth: setAnchorBorderThickness,
                                    radius: setAnchorRadius,
                                    symbol: mapSymbolName(setAnchorSides),
                                    startAngle: setAnchorAngle
                                },
                                hoverEffects: hoverEffects.enabled && hoverEffects.options,
                                rolloverProperties: hoverEffects.enabled && hoverEffects.rolloverOptions

                            }));

                            // Set the maximum and minimum found in data
                            // pointValueWatcher use to calculate the
                            // maximum and minimum value of the Axis
                            chartAPI.errorbar2d.pointValueWatcher(HCObj, itemValue,
                                errorValue);
                        } else {
                            // add the data
                            series.data.push({
                                y: null
                            });
                        }
                    }
                }
                if (ignoreEmptyDatasets && !hasValidPoint) {
                    series.showInLegend = false;
                }
                return series;
            }
        }, chartAPI.mslinebase);

        /////////////// ErrorBar2D ///////////
        //chartAPI('errorline2d', {
        chartAPI('errorscatter', {
            friendlyName: 'Error Scatter Chart',
            isXY: true,
            standaloneInit: true,
            creditLabel: creditLabel,
            chart: chartAPI.errorbar2d.chart,
            drawErrorValue: chartAPI.errorbar2d.drawErrorValue,
            defaultZeroPlaneHighlighted: false,
            useErrorGroup: true,
            rendererId: 'cartesian',
            isErrorChart: true,
            fireGroupEvent: true,
            point: function(chartName, series, dataset, FCChartObj, HCObj,
                catLength, seriesIndex) {
                var ignoreEmptyDatasets = pluckNumber(FCChartObj.ignoreemptydatasets, 0),
                    hasValidPoint = false,
                    chartNameAPI = this,
                    // Whether to draw scatter line
                    drawLine = pluckNumber(dataset.drawline, 0),
                    drawProgressionCurve =
                        pluckNumber(dataset.drawprogressioncurve, 0),
                    conf = HCObj[CONFIGKEY],
                    // Data array in dataset object
                    data,
                    regressionData,
                    dataLength,
                    // showValues attribute in individual dataset
                    datasetShowValues =
                        pluckNumber(dataset.showvalues, conf.showValues),
                    NumberFormatter = chartNameAPI.numberFormatter,

                    //Regratation line
                    showRegressionLine = pluckNumber(dataset.showregressionline,
                        FCChartObj.showregressionline, 0),
                    errorBarColor = pluck(FCChartObj.errorbarcolor, 'AAAAAA'),
                    errorBarAlpha = pluck(FCChartObj.errorbaralpha,
                        HUNDRED),
                    errorBarThickness =
                        pluckNumber(FCChartObj.errorbarthickness, 1),
                    errorBarWidth = pluckNumber(FCChartObj.errorbarwidth, 5),

                    halfVerticalErrorBar =
                        pluckNumber(FCChartObj.halfverticalerrorbar, 1),
                    verticalErrorBarAlpha = pluckNumber(
                        dataset.verticalerrorbaralpha, dataset.errorbaralpha,
                        FCChartObj.verticalerrorbaralpha, errorBarAlpha),
                    verticalErrorBarColor = convertColor(pluck(
                            dataset.verticalerrorbarcolor, dataset.errorbarcolor,
                            FCChartObj.verticalerrorbarcolor, errorBarColor),
                        verticalErrorBarAlpha),

                    verticalErrorBarThickness = pluckNumber(
                        dataset.verticalerrorbarthickness,
                        dataset.errorbarthickness,
                        FCChartObj.verticalerrorbarthickness,
                        errorBarThickness),

                    halfHorizontalErrorBar =
                        pluckNumber(FCChartObj.halfhorizontalerrorbar, 1),
                    horizontalErrorBarAlpha =
                        pluck(dataset.horizontalerrorbaralpha,
                            dataset.errorbaralpha,
                            FCChartObj.horizontalerrorbaralpha, errorBarAlpha),
                    horizontalErrorBarColor = convertColor(pluck(
                            dataset.horizontalerrorbarcolor, dataset.errorbarcolor,
                            FCChartObj.horizontalerrorbarcolor, errorBarColor),
                        horizontalErrorBarAlpha
                    ),
                    horizontalErrorBarThickness = pluckNumber(
                        dataset.horizontalerrorbarthickness,
                        dataset.errorbarthickness,
                        FCChartObj.horizontalerrorbarthickness,
                        errorBarThickness),
                    useHorizontalErrorBarDef = pluckNumber(
                        dataset.usehorizontalerrorbar,
                        FCChartObj.usehorizontalerrorbar, 0),
                    useVerticalErrorBarDef = pluckNumber(
                        dataset.useverticalerrorbar,
                        FCChartObj.useverticalerrorbar, 1),
                    regressionObj = {
                        sumX: 0,
                        sumY: 0,
                        sumXY: 0,
                        sumXsqure: 0,
                        sumYsqure: 0,
                        xValues: [],
                        yValues: []
                    },
                    colorM = this.colorManager,
                    plotColor = colorM.getPlotColor(),
                    itemValueY,
                    index,
                    scatterBorderColor,
                    scatterAlpha,
                    lineThickness,
                    lineDashed,
                    lineDashLen,
                    lineDashGap,
                    drawAnchors,
                    dataObj,
                    seriesAnchorSides,
                    seriesAnchorRadius,
                    seriesAnchorBorderColor,
                    seriesAnchorAngle,
                    seriesAnchorBorderThickness,
                    seriesAnchorBgColor,
                    seriesAnchorAlpha,
                    seriesAnchorBgAlpha,
                    setAnchorSides,
                    setAnchorRadius,
                    setAnchorBorderColor,
                    setAnchorBorderThickness,
                    setAnchorBgColor,
                    setAnchorAlpha,
                    setAnchorBgAlpha,
                    anchorShadow,
                    setAnchorShadow,

                    itemValueX,
                    errorValue,
                    hErrorValue,
                    vErrorValue,
                    pointStub,
                    useHorizontalErrorBar,
                    useVerticalErrorBar,
                    hErrorValueLabel,
                    vErrorValueLabel,
                    regSeries,
                    showYOnX,
                    regressionLineColor,
                    regressionLineThickness,
                    regressionLineAlpha,
                    regLineColor,
                    errorValueArr,
                    hoverEffects;

                chartNameAPI.errorBarShadow = pluckNumber(FCChartObj.errorbarshadow);

                // Add zIndex so that the regration line set at the
                // back of the series
                series.zIndex = 1;

                // Dataset seriesname
                series.name = getValidValue(dataset.seriesname);
                // If showInLegend set to false
                // We set series.name blank
                if (pluckNumber(dataset.includeinlegend) === 0 ||
                    series.name === undefined) {
                    series.showInLegend = false;
                }

                // --------------------- ERRORBARS ------------------------- //
                series.vErrorBarWidth = pluckNumber(
                    dataset.verticalerrorbarwidth, dataset.errorbarwidth,
                    FCChartObj.verticalerrorbarwidth, errorBarWidth);

                series.hErrorBarWidth = pluckNumber(
                    dataset.horizontalerrorbarwidth, dataset.errorbarwidth,
                    FCChartObj.horizontalerrorbarwidth, errorBarWidth);

                if (drawLine || drawProgressionCurve) {
                    if (drawProgressionCurve) {
                        series.type = 'spline';
                    }
                    // Line cosmetics attributes
                    // Color of the line series
                    scatterBorderColor = getFirstColor(pluck(dataset.color,
                        plotColor));
                    // Alpha of the line
                    scatterAlpha = pluck(dataset.alpha, HUNDREDSTRING);
                    // Line Thickness
                    lineThickness = pluckNumber(dataset.linethickness,
                        FCChartObj.linethickness, 2);
                    // Whether to use dashline
                    lineDashed = Boolean(pluckNumber(dataset.linedashed,
                        dataset.dashed, FCChartObj.linedashed, 0));

                    // line dash attrs
                    lineDashLen = pluckNumber(dataset.linedashlen,
                        FCChartObj.linedashlen, 5);
                    lineDashGap = pluckNumber(dataset.linedashgap,
                        FCChartObj.linedashgap, 4);

                    // Set the line color and alpha to
                    // HC seris obj with FusionCharts color format using FCcolor obj
                    series.color = convertColor(pluck(dataset.linecolor,
                            FCChartObj.linecolor, scatterBorderColor),
                        pluckNumber(dataset.linealpha, FCChartObj.linealpha,
                            scatterAlpha));

                    // Set the line thickness (line width)
                    series.lineWidth = lineThickness;
                    // Create line dash
                    // Using dashStyle of HC
                    series.dashStyle = lineDashed ? getDashStyle(lineDashLen,
                        lineDashGap, lineThickness) : undefined;
                }

                // Managing line series markers
                // Whether to drow the Anchor or not
                drawAnchors = Boolean(pluckNumber(dataset.drawanchors,
                    dataset.showanchors, FCChartObj.drawanchors,
                    FCChartObj.showanchors, 1));

                // Anchor cosmetics
                // We first look into dataset then chart obj and
                // then default value.
                seriesAnchorSides = pluckNumber(dataset.anchorsides,
                    FCChartObj.anchorsides, seriesIndex + 3);
                seriesAnchorRadius = pluckNumber(dataset.anchorradius,
                    FCChartObj.anchorradius, 3);
                seriesAnchorBorderColor = getFirstColor(pluck(
                    dataset.anchorbordercolor, dataset.color,
                    FCChartObj.anchorbordercolor, scatterBorderColor,
                    plotColor));
                seriesAnchorBorderThickness = pluckNumber(
                    dataset.anchorborderthickness,
                    FCChartObj.anchorborderthickness, 1);
                seriesAnchorBgColor = getFirstColor(pluck(dataset.anchorbgcolor,
                    FCChartObj.anchorbgcolor,
                    colorM.getColor('anchorBgColor')));
                seriesAnchorAlpha = pluck(dataset.anchoralpha, dataset.alpha,
                    FCChartObj.anchoralpha, HUNDRED);
                seriesAnchorBgAlpha = pluck(dataset.anchorbgalpha,
                    FCChartObj.anchorbgalpha, seriesAnchorAlpha);
                seriesAnchorAngle = pluck(dataset.anchorstartangle,
                    FCChartObj.anchorstartangle);

                series.anchorShadow = anchorShadow = pluckNumber(FCChartObj.anchorshadow, 0);

                //set the marker attr at series
                series.marker = {
                    fillColor: this.getPointColor(seriesAnchorBgColor,
                        HUNDRED),
                    lineColor: {
                        FCcolor: {
                            color: seriesAnchorBorderColor,
                            alpha: seriesAnchorAlpha + BLANK
                        }
                    },
                    lineWidth: seriesAnchorBorderThickness,
                    radius: seriesAnchorRadius,
                    symbol: mapSymbolName(seriesAnchorSides)
                };

                if (data = dataset.data) {
                    dataLength = data.length;
                    if (showRegressionLine) {
                        series.events = {
                            hide: this.hideRLine,
                            show: this.showRLine
                        };
                        //regration object used in XY chart
                        //create here to avoid checking always
                        showYOnX = pluckNumber(dataset.showyonx,
                            FCChartObj.showyonx, 1);
                        regressionLineColor = getFirstColor(pluck(
                            dataset.regressionlinecolor,
                            FCChartObj.regressionlinecolor,
                            seriesAnchorBorderColor));
                        regressionLineThickness = pluckNumber(
                            dataset.regressionlinethickness,
                            FCChartObj.regressionlinethickness,
                            seriesAnchorBorderThickness);
                        regressionLineAlpha = getFirstAlpha(pluckNumber(
                            dataset.regressionlinealpha,
                            FCChartObj.regressionlinealpha,
                            seriesAnchorAlpha));
                        regLineColor = convertColor(regressionLineColor,
                            regressionLineAlpha);
                    }

                    // Iterate through all level data
                    for (index = 0; index < dataLength; index += 1) {
                        // Individual data obj
                        // for further manipulation
                        dataObj = data[index];
                        if (dataObj) {
                            itemValueY = NumberFormatter.getCleanValue(dataObj.y);
                            itemValueX = NumberFormatter.getCleanValue(dataObj.x);
                            errorValue = NumberFormatter.getCleanValue(
                                dataObj.errorvalue);
                            hErrorValue = NumberFormatter.getCleanValue(
                                pluck(dataObj.horizontalerrorvalue, dataObj.errorvalue));
                            vErrorValue = NumberFormatter.getCleanValue(
                                pluck(dataObj.verticalerrorvalue, dataObj.errorvalue));
                            if (itemValueY === null) {
                                series.data.push({
                                    y: null,
                                    x: itemValueX
                                });
                                continue;
                            }

                            hasValidPoint = true;

                            pointStub = chartNameAPI.getPointStub(dataObj,
                                itemValueY, NumberFormatter.xAxis(itemValueX),
                                HCObj, dataset, datasetShowValues, undefined, vErrorValue, hErrorValue, itemValueX);

                            // Anchor cosmetics
                            // We first look into dataset then chart obj and then
                            // default value.
                            setAnchorSides = pluckNumber(dataObj.anchorsides,
                                seriesAnchorSides);
                            setAnchorRadius = pluckNumber(dataObj.anchorradius,
                                seriesAnchorRadius);
                            setAnchorBorderColor = getFirstColor(pluck(
                                dataObj.anchorbordercolor,
                                seriesAnchorBorderColor));
                            setAnchorBorderThickness = pluckNumber(
                                dataObj.anchorborderthickness,
                                seriesAnchorBorderThickness);
                            setAnchorBgColor = getFirstColor(pluck(
                                dataObj.anchorbgcolor, seriesAnchorBgColor));
                            setAnchorAlpha = pluck(dataObj.anchoralpha, dataObj.alpha,
                                seriesAnchorAlpha);
                            setAnchorBgAlpha = pluck(dataObj.anchorbgalpha,
                                seriesAnchorBgAlpha);

                            //----- Whether to use Horizontal or
                            // Vertical Error value -----//
                            useHorizontalErrorBar = Boolean(pluckNumber(
                                dataObj.usehorizontalerrorbar,
                                useHorizontalErrorBarDef));
                            useVerticalErrorBar = Boolean(pluckNumber(
                                dataObj.useverticalerrorbar,
                                useVerticalErrorBarDef));
                            //hErrorValue = vErrorValue = null;

                            errorValueArr = [];
                            if (useHorizontalErrorBar) {

                                hErrorValueLabel = pointStub._hErrortoolText;

                                errorValueArr.push({
                                    errorValue: hErrorValue,
                                    toolText: hErrorValueLabel,
                                    errorBarColor: horizontalErrorBarColor,
                                    isHorizontal: 1,
                                    errorBarThickness: horizontalErrorBarThickness,
                                    shadow: {
                                        opacity: horizontalErrorBarAlpha / 250
                                    }
                                });
                                if (!halfHorizontalErrorBar) {
                                    errorValueArr.push({
                                        errorValue: -hErrorValue,
                                        toolText: hErrorValueLabel,
                                        errorBarColor: horizontalErrorBarColor,
                                        isHorizontal: 1,
                                        errorBarThickness: horizontalErrorBarThickness,
                                        shadow: {
                                            opacity: horizontalErrorBarAlpha / 250
                                        }
                                    });
                                }
                            }
                            if (useVerticalErrorBar) {

                                vErrorValueLabel = pointStub._errortoolText;

                                errorValueArr.push({
                                    errorValue: vErrorValue,
                                    toolText: vErrorValueLabel,
                                    errorBarColor: verticalErrorBarColor,
                                    errorBarThickness: verticalErrorBarThickness,
                                    shadow: {
                                        opacity: verticalErrorBarAlpha / 250
                                    }
                                });
                                if (!halfVerticalErrorBar) {
                                    errorValueArr.push({
                                        errorValue: -vErrorValue,
                                        toolText: vErrorValueLabel,
                                        errorBarColor: verticalErrorBarColor,
                                        errorBarThickness: verticalErrorBarThickness,
                                        shadow: {
                                            opacity: verticalErrorBarAlpha / 250
                                        }
                                    });
                                }
                            }

                            // Point hover effects
                            hoverEffects = this.pointHoverOptions(dataObj, series, {
                                plotType: 'anchor',

                                anchorBgColor: setAnchorBgColor,
                                anchorAlpha: setAnchorAlpha,
                                anchorBgAlpha: setAnchorBgAlpha,
                                anchorAngle: seriesAnchorAngle,

                                anchorBorderThickness: setAnchorBorderThickness,
                                anchorBorderColor: setAnchorBorderColor,
                                anchorBorderAlpha: setAnchorAlpha,
                                anchorSides: setAnchorSides,
                                anchorRadius: setAnchorRadius
                            });
                            // Finally add the data
                            // we call getPointStub function that manage
                            // displayValue, toolText and link
                            series.data.push({
                                y: itemValueY,
                                x: itemValueX,
                                errorValue: errorValueArr,
                                displayValue: pointStub.displayValue,
                                toolText: pointStub.toolText,
                                link: pointStub.link,
                                marker: {
                                    enabled: drawAnchors,
                                    shadow: setAnchorShadow && {
                                        opacity: setAnchorAlpha / 100
                                    },
                                    fillColor: {
                                        FCcolor: {
                                            color: setAnchorBgColor,
                                            alpha: ((setAnchorBgAlpha *
                                                setAnchorAlpha) / 100) + BLANK
                                        }
                                    },
                                    lineColor: {
                                        FCcolor: {
                                            color: setAnchorBorderColor,
                                            alpha: setAnchorAlpha
                                        }
                                    },
                                    lineWidth: setAnchorBorderThickness,
                                    radius: setAnchorRadius,
                                    symbol: mapSymbolName(setAnchorSides),
                                    startAngle: pluck(dataObj.anchorstartangle,
                                        seriesAnchorAngle)
                                },
                                hoverEffects: hoverEffects.enabled &&
                                    hoverEffects.options,
                                rolloverProperties: hoverEffects.enabled &&
                                    hoverEffects.rolloverOptions

                            });

                            // Set the maximum and minimum found in data
                            // pointValueWatcher use to calculate the
                            // maximum and minimum value of the Axis
                            this.pointValueWatcher(HCObj, halfVerticalErrorBar ? itemValueY : itemValueY - vErrorValue,
                                halfHorizontalErrorBar ? itemValueX : itemValueX - hErrorValue, showRegressionLine &&
                                regressionObj);

                            this.pointValueWatcher(HCObj, itemValueY + vErrorValue,
                                itemValueX + hErrorValue, showRegressionLine &&
                                regressionObj);
                            /*if (halfHorizontalErrorBar == 0) {
                            this.pointValueWatcher(HCObj, itemValueY,
                                itemValueX - hErrorValue, showRegressionLine &&
                                regressionObj);
                        }
                        if (halfVerticalErrorBar == 0) {
                            this.pointValueWatcher(HCObj, itemValueY -
                                vErrorValue, itemValueX, showRegressionLine &&
                                regressionObj);
                        }*/
                        } else {
                            // add the data
                            series.data.push({
                                y: null
                            });
                        }
                    }

                    if (showRegressionLine) {
                        regressionData = this.getRegressionLineSeries(regressionObj,
                            showYOnX, dataLength);

                        this.pointValueWatcher(HCObj, regressionData[0].y,
                            regressionData[0].x);
                        this.pointValueWatcher(HCObj, regressionData[1].y,
                            regressionData[1].x);

                        regSeries = {
                            type: 'line',
                            color: regLineColor,
                            showInLegend: false,
                            lineWidth: regressionLineThickness,
                            enableMouseTracking: false,
                            marker: {
                                enabled: false
                            },
                            data: regressionData,
                            zIndex: 0
                        };
                        series = [series, regSeries];
                    }
                }
                // If all the values in current dataset is null
                // we will not show its legend
                if (ignoreEmptyDatasets && !hasValidPoint) {
                    series.showInLegend = false;
                }
                return series;
            }
        }, chartAPI.scatterbase);

        /////////////// WaterFall2D ///////////
        chartAPI('waterfall2d', {
            friendlyName: 'Waterfall Chart',
            standaloneInit: true,
            isWaterfall: true,
            creditLabel: creditLabel,
            point: function(chartName, series, data, FCChartObj, HCObj) {

                var
                itemValue, index, countPoint, dataLabel, setColor, setAlpha,
                    setRatio, colorArr, dataObj, setAngle, showLabel, pointShadow,
                    hoverEffects, pointDashStyle, setBorderAlpha, setBorderDashed,
                    setBorderDashGap, setBorderDashLen,
                    lineThickness = pluck(FCChartObj.connectorthickness, 1),
                    zLine = {
                        step: true,
                        type: 'line',
                        enableMouseTracking: false,
                        data: [],
                        dataLabels: {
                            enabled: false
                        },
                        marker: {
                            enabled: false
                        },
                        dashStyle: FCChartObj.connectordashed === '1' ? getDashStyle(
                            pluckNumber(FCChartObj.connectordashlen, 2), pluckNumber(
                                FCChartObj.connectordashgap, 2), lineThickness) : undefined,
                        drawVerticalJoins: false,
                        useForwardSteps: true,
                        color: convertColor(pluck(FCChartObj.connectorcolor, '000000'), pluck(FCChartObj.connectoralpha,
                         100)),
                        lineWidth: lineThickness
                    },
                    colorM = this.colorManager,
                    // length of the data
                    length = data.length,
                    conf = HCObj[CONFIGKEY],
                    // axisGridManager to manage the axis
                    // it contains addVline, addXaxisCat, addAxisAltGrid and
                    // addAxisGridLine function
                    axisGridManager = conf.axisGridManager,
                    xAxisObj = HCObj.xAxis,
                    // xAxis configuration it contains configuration of xAxis like
                    // catCount, horizontalAxisNamePadding, horizontalLabelPadding,
                    // labelDisplay, slantLabels, staggerLines
                    xAxisConf = conf.x,
                    // is3d and isBar helps to get the column color by getColumnColor function
                    // whether the chart is a 3D or Bar
                    is3d = /3d$/.test(HCObj.chart.defaultSeriesType),
                    isBar = this.isBar,
                    // dataplot border width
                    // Managing for 3D too
                    showPlotBorder = pluck(FCChartObj.showplotborder, (is3d ? ZERO : ONE)) === ONE,
                    // 3D column chart doesn't show the plotborder by default until we set showplotborder true
                    setBorderWidth = showPlotBorder ?
                        (is3d ? 1 : pluckNumber(FCChartObj.plotborderthickness, 1)) : 0,
                    // whether to use round edges or not in the column
                    isRoundEdges = HCObj.chart.useRoundEdges,
                    // dataplot border alpha
                    setPlotBorderAlpha = pluckNumber(FCChartObj.plotborderalpha, FCChartObj.plotfillalpha, 100) + BLANK,
                    // dataplot border color
                    setPlotBorderColor = pluck(FCChartObj.plotbordercolor,
                        colorM.getColor('plotBorderColor').split(COMMA)[0]),
                    // GradientColor of the plot fill
                    seriesGradientColor = (pluckNumber(FCChartObj.useplotgradientcolor, 1) ?
                        getDefinedColor(FCChartObj.plotgradientcolor,
                            colorM.getColor('plotGradientColor')) :
                        BLANK),
                    plotBorderDashed = pluckNumber(FCChartObj.plotborderdashed, 0),
                    plotBorderDashLen = pluckNumber(FCChartObj.plotborderdashlen, 6),
                    plotBorderDashGap = pluckNumber(FCChartObj.plotborderdashgap, 3),
                    // Original index of the data inside the loop
                    catIndex = 0,
                    issum,
                    cumulative,
                    // use3DLighting to show gredient color effect in 3D Column charts
                    use3DLighting = Boolean(pluckNumber(FCChartObj.use3dlighting, 1)),
                    total = 0,
                    lastComTotal = 0,
                    NumberFormatter = HCObj[CONFIGKEY].numberFormatter,
                    displayValue,
                    setDisplayValue,
                    formatedVal,
                    toolText,
                    setTooltext,
                    formatedSum,
                    seriesSum = 0,
                    sumObj,
                    showSum = pluckNumber(FCChartObj.showsumatend, 1);

                //calculate sum
                for (index = 0; index < length; index += 1) {
                    // individual data obj
                    dataObj = data[index];
                    itemValue = NumberFormatter.getCleanValue(dataObj.value);
                    issum = pluckNumber(dataObj.issum, 0);
                    // If its vline then don't calculate
                    if (dataObj.vline || issum) {
                        continue;
                    }
                    seriesSum += itemValue;
                    dataObj._value = itemValue;
                }
                formatedSum = NumberFormatter.dataLabels(seriesSum);
                //Is we have to show sum at end then create a dummy set for tortal
                if (showSum) {
                    showSum = true;
                    length += 1;
                    sumObj = {
                        label: getFirstValue(FCChartObj.sumlabel, 'Total'),
                        _value: seriesSum,
                        value: seriesSum,
                        issum: 1,
                        cumulative: 1
                    };
                }
                // Iterate through all level data
                // We are managing the data value labels and other cosmetics inside this loop
                for (index = 0, countPoint = 0; index < length; index += 1) {

                    // individual data obj
                    dataObj = data[index];
                    if (!dataObj && showSum) {
                        dataObj = sumObj;
                    }

                    // Managing vLines in between <set> elements
                    // If its vline
                    // we call the grid manager addVline function, that creates vline
                    // and we stop execution here and continue the loop to next data
                    if (dataObj.vline) {
                        axisGridManager.addVline(xAxisObj, dataObj, catIndex, HCObj);
                        continue;
                    }

                    // get the valid value
                    // parsePointValue check the its a value value of not and return
                    // the valid value

                    itemValue = dataObj._value;
                    delete dataObj._value;
                    issum = pluckNumber(dataObj.issum, 0);
                    cumulative = pluckNumber(dataObj.cumulative, 1);
                    if (issum) {
                        itemValue = cumulative ? total :
                            (total === lastComTotal ? total : (total - lastComTotal));
                        lastComTotal = total;
                        zLine.data.push({
                            y: null,
                            x: countPoint - 0.5
                        });
                    } else {
                        total += itemValue;
                    }

                    // we check showLabel in individual data
                    // if its set to 0 than we do not show the particular label
                    showLabel = pluckNumber(dataObj.showlabel, FCChartObj.showlabels, 1);

                    // Label of the data
                    // getFirstValue returns the first defined value in arguments
                    // we check if showLabel is not set to 0 in data
                    // then we take the label given in data, it can be given using label as well as name too
                    // we give priority to label if label is not there, we check the name attribute
                    dataLabel = parseUnsafeString(!showLabel ? BLANK : getFirstValue(dataObj.label, dataObj.name));

                    // increase category counter by one
                    axisGridManager.addXaxisCat(xAxisObj, catIndex, catIndex, dataLabel);
                    catIndex += 1;

                    // <set> cosmetics
                    // Color of the particular data
                    if (itemValue > 0) {
                        setColor = pluck(dataObj.color, FCChartObj.positivecolor,
                            colorM.getPlotColor());
                        if (series.hoverEffects) {
                            series.hoverEffects.color = pluck(dataObj.positivehovercolor,
                                FCChartObj.positivehovercolor, FCChartObj.plotfillhovercolor);
                        }
                    } else {
                        setColor = pluck(dataObj.color, FCChartObj.negativecolor,
                            colorM.getPlotColor());
                        if (series.hoverEffects) {
                            series.hoverEffects.color = pluck(dataObj.negativehovercolor,
                                FCChartObj.negativehovercolor, FCChartObj.plotfillhovercolor);
                        }
                    }

                    // Alpha of the data
                    setAlpha = pluck(dataObj.alpha, FCChartObj.plotfillalpha, HUNDRED);
                    // Fill ratio of the data
                    setRatio = pluck(dataObj.ratio, FCChartObj.plotfillratio);
                    // defaultAngle depend upon item value
                    setAngle = pluck(360 - FCChartObj.plotfillangle, 90);
                    if (itemValue < 0) {
                        setAngle = 360 - setAngle;
                    }
                    setBorderAlpha = pluck(dataObj.alpha, setPlotBorderAlpha);
                    setBorderDashed = pluckNumber(dataObj.dashed, plotBorderDashed);
                    setBorderDashGap = pluck(dataObj.dashgap, plotBorderDashGap);
                    setBorderDashLen = pluck(dataObj.dashlen, plotBorderDashLen);

                    // Used to set alpha of the shadow
                    pointShadow = {
                        opacity: setAlpha / 100,
                        inverted: isBar
                    };

                    // calculate the color object for the column
                    colorArr = getColumnColor(setColor + COMMASTRING +
                        seriesGradientColor.replace(/,+?$/, ''),
                        setAlpha, setRatio,
                        setAngle, isRoundEdges, setPlotBorderColor,
                        pluck(dataObj.alpha, setPlotBorderAlpha), isBar, is3d);

                    // get per-point dash-style
                    pointDashStyle = setBorderDashed ?
                        getDashStyle(setBorderDashLen, setBorderDashGap, setBorderWidth) :
                        'none';

                    hoverEffects = this.pointHoverOptions(dataObj, series, {
                        plotType: 'column',
                        is3d: is3d,
                        isBar: isBar,

                        use3DLighting: use3DLighting,
                        isRoundEdged: isRoundEdges,

                        color: setColor,
                        gradientColor: seriesGradientColor,
                        alpha: setAlpha,
                        ratio: setRatio,
                        angle: setAngle,

                        borderWidth: setBorderWidth,
                        borderColor: setPlotBorderColor,
                        borderAlpha: setBorderAlpha,
                        borderDashed: setBorderDashed,
                        borderDashGap: setBorderDashGap,
                        borderDashLen: setBorderDashLen,

                        shadow: pointShadow
                    });

                    setDisplayValue = getValidValue(parseUnsafeString(dataObj.displayvalue));
                    formatedVal = itemValue === null ? itemValue : NumberFormatter.dataLabels(itemValue);
                    setTooltext = getValidValue(parseUnsafeString(pluck(dataObj.tooltext, conf.tooltext)));
                    //create the tooltext
                    if (!conf.showTooltip) {
                        toolText = BLANK;
                    } else if (setTooltext !== undefined) {
                        toolText = parseTooltext(setTooltext, [1, 2, 3, 5, 6, 7, 20, 21, 24, 25], {
                            formattedValue: formatedVal,
                            label: dataLabel,
                            yaxisName: parseUnsafeString(FCChartObj.yaxisname),
                            xaxisName: parseUnsafeString(FCChartObj.xaxisname),
                            cumulativeValue: total,
                            cumulativeDataValue: NumberFormatter.dataLabels(total),
                            sum: formatedSum,
                            unformattedSum: seriesSum
                        }, dataObj, FCChartObj);
                    } else { //determine the dispalay value then
                        toolText = formatedVal === null ? false :
                            (dataLabel !== BLANK) ? dataLabel + conf.tooltipSepChar + formatedVal : formatedVal;
                    }

                    //create the displayvalue
                    if (!pluckNumber(dataObj.showvalue, conf.showValues)) {
                        displayValue = BLANK;
                    } else if (setDisplayValue !== undefined) {
                        displayValue = setDisplayValue;
                    } else { //determine the dispalay value then
                        displayValue = formatedVal;
                    }

                    // Finally add the data
                    // we call getPointStub function that manage displayValue, toolText and link
                    series.data.push({
                        y: itemValue,
                        _FCY: itemValue < 0 ? (total - itemValue) : total,
                        previousY: itemValue < 0 ? total : total - itemValue === 0 ? UNDEFINED : total - itemValue,
                        shadow: pointShadow,
                        color: colorArr[0],
                        borderColor: colorArr[1],
                        borderWidth: setBorderWidth,
                        dashStyle: pointDashStyle,
                        use3DLighting: use3DLighting,
                        hoverEffects: hoverEffects.enabled && hoverEffects.options,
                        rolloverProperties: hoverEffects.enabled && hoverEffects.rolloverOptions,
                        displayValue: displayValue,
                        categoryLabel: dataLabel,
                        toolText: toolText,
                        link: pluck(dataObj.link)
                    });
                    zLine.data.push({
                        y: itemValue && total,
                        x: countPoint
                    });
                    // Set the maximum and minimum found in data
                    // pointValueWatcher use to calculate the maximum and minimum value of the Axis
                    this.pointValueWatcher(HCObj, total);
                    countPoint += 1;
                }

                // set the xAxisConf catCount for further use
                xAxisConf.catCount = catIndex;
                if (FCChartObj.showconnectors != '0') {
                    series = [zLine, series];
                }
                return series;
            },
            defaultSeriesType: 'column',
            rendererId: 'cartesian'
        }, singleSeriesAPI);

        /////////////// MultiLevelPie ///////////
        ///function to add mspie data
        chartAPI('multilevelpie', {
            friendlyName: 'Multi-level Pie Chart',
            standaloneInit: true,
            defaultSeriesType: 'multilevelpie',
            rendererId: 'multiLevelPie',
            defaultPlotShadow: 0,
            series: function() {
                var iapi = this,
                    dataObj = iapi.dataObj,
                    hcObj = iapi.hcJSON,
                    chartAttrs = dataObj.chart,
                    series = hcObj.series,
                    conf = {},
                    y,
                    useHoverColor = Boolean(pluckNumber(chartAttrs.usehovercolor, 1)),
                    hoverFillColor = convertColor(pluck(chartAttrs.hoverfillcolor, 'FF5904'),
                        pluckNumber(chartAttrs.hoverfillalpha, 100)),
                    pierad = parseInt(chartAttrs.pieradius, 10),
                    serieswidth,
                    inner = 0,
                    ispersent = true;

                //make the plotBackground transparent
                hcObj.chart.plotBorderColor = 0;
                hcObj.chart.plotBackgroundColor = null;

                //fix for pie datalabels style issue
                hcObj.plotOptions.series.dataLabels.style = hcObj.xAxis.labels.style;
                hcObj.plotOptions.series.dataLabels.color = hcObj.xAxis.labels.style.color;

                //disable legend
                hcObj.legend.enabled = false;

                //stop point slicing
                hcObj.plotOptions.pie.allowPointSelect = false;

                //set the bordercolor
                hcObj.plotOptions.series.borderColor = convertColor(pluck(chartAttrs.plotbordercolor,
                        chartAttrs.piebordercolor, 'FFFFFF'), chartAttrs.showplotborder != '0' ?
                    pluck(chartAttrs.plotborderalpha, chartAttrs.pieborderalpha, 100) : 0);
                hcObj.plotOptions.series.borderWidth = pluckNumber(chartAttrs.pieborderthickness,
                    chartAttrs.plotborderthickness, 1);
                hcObj.plotOptions.pie.startingAngle = 0; //set the chart's startingAngle as 0 [alwase]
                hcObj.plotOptions.pie.size = '100%';

                conf.showLabels = pluckNumber(chartAttrs.showlabels, 1);
                conf.showValues = pluckNumber(chartAttrs.showvalues, 0);
                conf.showValuesInTooltip = pluckNumber(chartAttrs.showvaluesintooltip,
                    chartAttrs.showvalues, 0);
                conf.showPercentValues = pluckNumber(chartAttrs.showpercentvalues,
                    chartAttrs.showpercentagevalues, 0);
                conf.showPercentInTooltip = pluckNumber(chartAttrs.showpercentintooltip, 0);
                conf.toolTipSepChar = pluck(chartAttrs.tooltipsepchar, chartAttrs.hovercapsepchar, COMMASPACE);
                conf.labelSepChar = pluck(chartAttrs.labelsepchar, conf.toolTipSepChar);
                conf.tooltext = chartAttrs.plottooltext;

                //add mouse over and mouse out events
                if (useHoverColor) {
                    hcObj.plotOptions.series.point.events = {
                        mouseOver: function() {
                            var point = this,
                                chart = point.chart,
                                series = chart.plots,
                                seri,
                                pointIndex,
                                seriesIndex;
                            while (point) {
                                point.graphic.attr({
                                    fill: hoverFillColor
                                });
                                pointIndex = point.prevPointIndex;
                                seriesIndex = point.prevSeriesIndex;
                                point = (seri = series[seriesIndex]) && seri.items && seri.items[pointIndex];

                            }
                        },
                        mouseOut: function() {
                            var point = this,
                                chart = point.chart,
                                series = chart.plots,
                                seri,
                                pointIndex,
                                seriesIndex;
                            while (point) {
                                point.graphic.attr({
                                    fill: point.color
                                });
                                pointIndex = point.prevPointIndex;
                                seriesIndex = point.prevSeriesIndex;
                                point = (seri = series[seriesIndex]) && seri.items && seri.items[pointIndex];

                            }
                        }
                    };
                }
                //remove the plotboder
                hcObj.chart.plotBorderWidth = 0;
                if (dataObj.category) {
                    //send default alpha as it ma suplyed by the chart piefillAlpha
                    this.addMSPieCat(dataObj.category, 0, 0, 100, pluck(chartAttrs.plotfillalpha,
                        chartAttrs.piefillalpha, 100), conf, null);
                }
                pierad = parseInt(chartAttrs.pieradius, 10);
                inner = 0;
                ispersent = true;
                if (pierad) {
                    serieswidth = (2 * pierad) / series.length;
                    ispersent = false;
                } else {
                    serieswidth = parseInt(100 / series.length, 10);
                }
                hcObj.plotOptions.series.dataLabels.distance = 0;
                hcObj.plotOptions.series.dataLabels.placeLabelsInside = true;

                //chart.options.plotOptions.series.dataLabels.placeLabelsInside
                //iterate through all data series
                for (y = 0; y < series.length; y += 1) {

                    //set the size and iner radious
                    series[y].innerSize = inner + (ispersent ? '%' : '');
                    series[y].size = (inner += serieswidth) + (ispersent ? '%' : '');
                    if (series[y].data[series[y].data.length - 1].y === 0) {
                        series[y].data.pop();
                    }
                }


            },
            //manage the space for title only
            spaceManager: function(hcJSON, fcJSON, width, height) {
                var iapi = this,
                    conf = hcJSON[CONFIGKEY],
                    marginLeftExtraSpace = conf.marginLeftExtraSpace,
                    marginTopExtraSpace = conf.marginTopExtraSpace,
                    marginBottomExtraSpace = conf.marginBottomExtraSpace,
                    marginRightExtraSpace = conf.marginRightExtraSpace,
                    workingWidth = width - (marginLeftExtraSpace + marginRightExtraSpace +
                        hcJSON.chart.marginRight + hcJSON.chart.marginLeft),
                    workingHeight = height - (marginBottomExtraSpace + marginTopExtraSpace + hcJSON.chart.marginBottom +
                        hcJSON.chart.marginTop);
                iapi.titleSpaceManager(hcJSON, fcJSON, workingWidth, workingHeight * 0.4);
            },

            addMSPieCat: function(cat, level, start, end, alpha, chartConf, prevCatIndex) {

                var iapi = this,
                    hcObj = iapi.hcJSON,
                    numberFormatter = iapi.numberFormatter,
                    colorM = iapi.colorManager,
                    sLevel,
                    sharePercent,
                    totalValue = 0,
                    catLaxtIndex = cat.length - 1,
                    catObj,
                    catVal,
                    i,
                    space,
                    label,
                    series = hcObj.series,
                    labelSepChar = chartConf.labelSepChar,
                    pointIndex,
                    fillalpha,
                    valueStr,
                    pValueStr,
                    toolText,
                    displayValue;

                if (iapi.colorCount === undefined) {
                    iapi.colorCount = 0;
                }

                if (level === 0) {
                    iapi.colorCount = 0;
                }
                //if the series dosen't exist
                //add a blank series
                /** @todo change default stub so that no blank series will be at the starting */
                if (!series[level]) {
                    series[level] = {
                        data: [{
                            toolText: false,
                            doNotSlice: true, //added to stop slicing
                            y: 100,
                            visible: false,
                            color: 'rgba(255,255,255,0)' //set the color a s transparent
                        }]
                    };
                }
                sLevel = series[level];
                ////
                //reduce the blank labels value[may need to split the slice]
                //check blank-slice and the start get same
                //find the gap between blank lavel and start
                space = start - 100 + sLevel.data[sLevel.data.length - 1].y;
                //there has a space
                if (space) {
                    sLevel.data.splice(sLevel.data.length - 1, 0, {
                        toolText: false,
                        doNotSlice: true, //added to stop slicing
                        y: space,
                        visible: false,
                        color: 'rgba(255,255,255,0)' //set the color as transparent
                    });
                }
                sLevel.data[sLevel.data.length - 1].y = 100 - end;

                //support for value in cat tag
                for (i = 0; i <= catLaxtIndex; i += 1) {
                    catObj = cat[i];
                    //store for letter use
                    catObj._userValue = numberFormatter.getCleanValue(catObj.value,
                        iapi.isValueAbs);
                    catObj._value = pluckNumber(catObj._userValue, 1);
                    totalValue += catObj._value;
                }
                // Total value can't be zero, since its used in denominator to find ratio.
                totalValue = totalValue || 1;

                //add the category
                sharePercent = (end - start) / totalValue;
                for (i = catLaxtIndex; i >= 0; i -= 1) {
                    catObj = cat[i];
                    catVal = sharePercent * catObj._value;
                    label = parseUnsafeString(pluck(catObj.label, catObj.name));
                    valueStr = catObj._userValue !== null ?
                        numberFormatter.dataLabels(catObj._userValue) : BLANK;
                    pValueStr = numberFormatter.percentValue((catObj._value /
                        totalValue) * 100);
                    pointIndex = sLevel.data.length - 1;
                    fillalpha = pluckNumber(catObj.alpha, alpha);
                    displayValue = chartConf.showLabels ? label : BLANK;
                    if (chartConf.showValues) {
                        if (chartConf.showPercentValues) {
                            displayValue += displayValue !== BLANK ? (labelSepChar + pValueStr) : pValueStr;
                        } else if (valueStr !== undefined && valueStr !== BLANK) {
                            displayValue += displayValue !== BLANK ? (labelSepChar + valueStr) : valueStr;
                        }
                    }
                    toolText = parseUnsafeString(pluck(catObj.tooltext, catObj.hovertext, chartConf.tooltext));
                    if (toolText === BLANK) {
                        toolText = label;
                        if (chartConf.showValuesInTooltip) {
                            if (chartConf.showPercentInTooltip) {
                                toolText += toolText !== BLANK ? (labelSepChar + pValueStr) : pValueStr;
                            } else if (valueStr !== undefined && valueStr !== BLANK) {
                                toolText += toolText !== BLANK ? (labelSepChar + valueStr) : valueStr;
                            }
                        }
                    } else {
                        toolText = parseTooltext(toolText, [1, 2, 3, 14], {
                            percentValue: pValueStr,
                            label: label,
                            formattedValue: valueStr
                        }, catObj);
                    }

                    sLevel.data.splice(pointIndex, 0, {
                        prevPointIndex: prevCatIndex,
                        prevSeriesIndex: level - 1,
                        displayValue: displayValue,
                        toolText: toolText,
                        y: catVal,
                        link: getValidValue(catObj.link),
                        doNotSlice: true, //added to stop slicing
                        color: convertColor(catObj.color || colorM.getPlotColor(), fillalpha),
                        shadow: {
                            opacity: mathRound(fillalpha > 50 ? fillalpha * fillalpha * fillalpha * 0.0001 :
                                fillalpha * fillalpha * 0.01) * 0.01
                        } //fix for PCXT-465
                    });
                    iapi.colorCount += 1;
                    if (catObj.category) {
                        iapi.addMSPieCat(catObj.category, level + 1, start, (i === 0) ?
                            end : (start + catVal), alpha, chartConf, pointIndex);
                    }
                    start += catVal;
                }
            },
            isValueAbs: true,
            creditLabel: creditLabel
        }, singleSeriesAPI);

        /////////////// Radar ///////////
        chartAPI('radar', {
            friendlyName: 'Radar Chart',
            standaloneInit: true,
            creditLabel: creditLabel,
            defaultSeriesType: 'radar',
            areaAlpha: 50,
            spaceManager: function(hcJSON, fcJSON, width, height) {
                //make the plotBackground transparent
                hcJSON.chart.plotBorderWidth = 0;
                hcJSON.chart.plotBackgroundColor = null;
                var iapi = this,
                    conf = hcJSON[CONFIGKEY],
                    xAxisConf = conf.x,
                    xAxis = hcJSON.xAxis,
                    yAxis = hcJSON.yAxis[0],
                    fcJSONChart = fcJSON.chart,
                    labelPadding = pluckNumber(fcJSONChart.labelpadding, fcJSONChart.labelxpadding, parseInt((
                        yAxis && yAxis.labels && yAxis.labels.style && yAxis.labels.style.fontSize) || 10, 10)),
                    marginLeftExtraSpace = conf.marginLeftExtraSpace,
                    marginTopExtraSpace = conf.marginTopExtraSpace,
                    marginBottomExtraSpace = conf.marginBottomExtraSpace,
                    marginRightExtraSpace = conf.marginRightExtraSpace,
                    workingWidth = width - (marginLeftExtraSpace + marginRightExtraSpace +
                        hcJSON.chart.marginRight + hcJSON.chart.marginLeft),
                    workingHeight = height - (marginBottomExtraSpace + marginTopExtraSpace + hcJSON.chart.marginBottom +
                        hcJSON.chart.marginTop),
                    colorM = this.colorManager,
                    minWorkingWidth,
                    minWorkingHeight,
                    minWorkingRadius,
                    pieRadius,
                    lineHeight2,
                    labelPadding2,
                    minOfWH,
                    pieMinRadius;

                workingHeight -= iapi.titleSpaceManager(hcJSON, fcJSON, workingWidth, workingHeight * 0.4);

                //set the xAxis min max
                xAxis.min = pluckNumber(xAxisConf.min, 0);
                xAxis.max = pluckNumber(xAxisConf.max, xAxisConf.catCount - 1);
                xAxis.gridLineColor = convertColor(pluck(fcJSONChart.radarspikecolor,
                        colorM.getColor('divLineColor')),
                    pluckNumber(fcJSONChart.radarspikealpha, fcJSONChart.radarinlinealpha,
                        colorM.getColor('divLineAlpha')));
                xAxis.gridLineWidth = pluckNumber(fcJSONChart.radarspikethickness, 1);
                xAxis.showRadarBorder = pluckNumber(fcJSONChart.showradarborder, 1);
                xAxis.radarBorderThickness = pluckNumber(fcJSONChart.radarborderthickness, 2);
                xAxis.radarBorderColor = convertColor(pluck(fcJSONChart.radarbordercolor,
                        colorM.getColor('divLineColor')),
                    pluckNumber(fcJSONChart.radarborderalpha, 100));
                xAxis.radarFillColor = convertColor(pluck(fcJSONChart.radarfillcolor,
                        colorM.getColor('altHGridColor')),
                    pluckNumber(fcJSONChart.radarfillalpha, colorM.getColor('altHGridAlpha')));


                if (hcJSON.legend.enabled) {
                    if (pluck(fcJSONChart.legendposition, POSITION_BOTTOM).toLowerCase() != POSITION_RIGHT) {
                        workingHeight -= this.placeLegendBlockBottom(hcJSON, fcJSON, workingWidth,
                            workingHeight / 2);
                    } else {
                        workingWidth -= this.placeLegendBlockRight(hcJSON, fcJSON,
                            workingWidth / 3, workingHeight);
                    }
                }
                pieRadius = pluckNumber(fcJSONChart.radarradius);
                lineHeight2 = 2 * pluckNumber(parseInt(xAxis.labels.style.lineHeight, 10), 12);
                labelPadding2 = labelPadding * 2;
                /** @todo dynamicaly calculate label space */
                //100 px fixed label width
                minOfWH = mathMin(workingWidth - (100 + labelPadding2), workingHeight - (lineHeight2 + labelPadding2));
                pieMinRadius = pieRadius || minOfWH * 0.5;
                /*if (!(pieMinRadius > 0)) {
                pieMinRadius = 5;//min 5 px radius
            }*/
                minWorkingWidth = workingWidth * 0.3;
                minWorkingHeight = workingHeight * 0.3;
                minWorkingRadius = mathMin(minWorkingWidth, minWorkingHeight);

                if (pieMinRadius < minWorkingRadius) {
                    pieMinRadius = minWorkingRadius;
                }
                hcJSON.chart.axisRadius = pieMinRadius;
                //store labelPadding to use during drawing
                xAxis.labels.labelPadding = labelPadding;
            },
            anchorAlpha: '100',
            showValues: 0,
            isRadar: true,
            rendererId: 'radar'
        }, chartAPI.msareabase);

        // 2- Create the floatedcolumn point object
        //// NO code
        // 3 - Create the floatedcolumn series constractor
        dragExtension = {
            dragExtended: true,
            defaultRestoreButtonVisible: 1,

            spaceManager: function(hcJSON, fcJSON, width, height) {
                //calculate the space for submit and restore
                var iapi = this,
                    conf = hcJSON[CONFIGKEY],
                    chartOptions = hcJSON.chart,
                    chartAttr = fcJSON.chart,
                    outCanvasStyle = conf.outCanvasStyle,
                    //max allow 30% of avaiable height
                    maxAllowedHeight = (height - (conf.marginBottomExtraSpace + chartOptions.marginBottom +
                        chartOptions.marginTop) * 0.3),
                    buttonHeight = 0,
                    buttonWidth = 0,
                    //add for obj extra for fi=orm configuration
                    smartLabel = iapi.smartLabel || conf.smartLabel,
                    textPadding2 = 4,
                    smartText,
                    smartText2,
                    fontSize;


                //form element conf
                chartOptions.formAction = getValidValue(chartAttr.formaction);
                chartOptions.formDataFormat = pluck(chartAttr.formdataformat,
                    global.dataFormats.XML);
                chartOptions.formTarget = pluck(chartAttr.formtarget, '_self');
                chartOptions.formMethod = pluck(chartAttr.formmethod, 'POST');
                chartOptions.submitFormAsAjax = pluckNumber(chartAttr.submitformusingajax, 1);

                // Form Button
                chartOptions.showFormBtn = pluckNumber(chartAttr.showformbtn, 1) && chartOptions.formAction;
                chartOptions.formBtnTitle = pluck(chartAttr.formbtntitle, 'Submit');
                chartOptions.formBtnBorderColor = pluck(chartAttr.formbtnbordercolor, 'CBCBCB');
                chartOptions.formBtnBgColor = pluck(chartAttr.formbtnbgcolor, 'FFFFFF');
                chartOptions.btnPadding = pluckNumber(chartAttr.btnpadding, 7); //2 px more for better presentation
                chartOptions.btnSpacing = pluckNumber(chartAttr.btnspacing, 5);
                chartOptions.formBtnStyle = {
                    fontSize: outCanvasStyle.fontSize,
                    fontFamily: outCanvasStyle.fontFamily,
                    fontWeight: 'bold'
                };
                chartOptions.formBtnLabelFill = outCanvasStyle.color;
                if (chartAttr.btntextcolor) {
                    chartOptions.formBtnLabelFill = chartAttr.btntextcolor.replace(dropHash, HASHSTRING);
                }
                if ((fontSize = pluckNumber(chartAttr.btnfontsize)) >= 0) {
                    chartOptions.formBtnStyle.fontSize = fontSize + PX;
                }
                //set the line height
                setLineHeight(chartOptions.formBtnStyle);


                // Restore Button Chart
                chartOptions.showRestoreBtn = pluckNumber(chartAttr.showrestorebtn,
                    this.defaultRestoreButtonVisible, 1);

                if (chartOptions.showRestoreBtn) { //if  reset btn is visible
                    chartOptions.restoreBtnTitle = pluck(chartAttr.restorebtntitle, 'Restore');
                    chartOptions.restoreBtnBorderColor = pluck(chartAttr.restorebtnbordercolor,
                        chartOptions.formBtnBorderColor);
                    chartOptions.restoreBtnBgColor = pluck(chartAttr.restorebtnbgcolor,
                        chartOptions.formBtnBgColor);
                    chartOptions.restoreBtnStyle = {
                        fontSize: chartOptions.formBtnStyle.fontSize,
                        fontFamily: chartOptions.formBtnStyle.fontFamily,
                        fontWeight: 'bold'
                    };
                    chartOptions.restoreBtnLabelFill = chartOptions.formBtnLabelFill;

                    if (chartAttr.restorebtntextcolor) {
                        chartOptions.restoreBtnLabelFill = chartAttr.restorebtntextcolor.replace(dropHash,
                        HASHSTRING);
                    }
                    if ((fontSize = pluckNumber(chartAttr.restorebtnfontsize)) >= 0) {
                        chartOptions.restoreBtnStyle.fontSize = fontSize + PX;
                    }
                    setLineHeight(chartOptions.restoreBtnStyle);
                }

                chartOptions.showLimitUpdateMenu =
                    pluckNumber(chartAttr.showlimitupdatemenu, 1);

                //submit button
                if (chartOptions.showFormBtn) {
                    smartLabel.setStyle(chartOptions.formBtnStyle);
                    smartText = smartLabel.getOriSize(chartOptions.formBtnTitle);
                    buttonHeight = smartText.height || 0;
                }
                //restore button
                if (chartOptions.showRestoreBtn) {
                    smartLabel.setStyle(chartOptions.restoreBtnStyle);
                    smartText2 = smartLabel.getOriSize(chartOptions.restoreBtnTitle);
                    buttonHeight = mathMax(smartText2.height, buttonHeight) || 0;
                }
                if (buttonHeight > 0) {
                    buttonHeight += chartOptions.btnPadding + textPadding2;

                    if (buttonHeight > maxAllowedHeight) {
                        chartOptions.btnPadding = mathMax(chartOptions.btnPadding - buttonHeight + maxAllowedHeight,
                            0) / 2;
                        buttonHeight = maxAllowedHeight;
                    }
                }
                chartOptions.btnHeight = buttonHeight;

                // calculate widths of buttons
                if (chartOptions.showFormBtn) {
                    buttonWidth = smartText.width + buttonHeight;
                    chartOptions.formBtnWidth = pluckNumber(chartAttr.formbtnwidth, buttonWidth);
                    if (chartOptions.formBtnWidth < smartText.width) {
                        chartOptions.formBtnWidth = buttonWidth;
                    }
                }

                if (chartOptions.showRestoreBtn) {
                    buttonWidth = smartText2.width + buttonHeight;
                    chartOptions.restoreBtnWidth = pluckNumber(chartAttr.restorebtnwidth, buttonWidth);
                    if (chartOptions.restoreBtnWidth < smartText2.width) {
                        chartOptions.restoreBtnWidth = buttonWidth;
                    }
                }

                //add the space at button
                chartOptions.marginBottom += buttonHeight + chartOptions.btnPadding;
                chartOptions.spacingBottom += buttonHeight + chartOptions.btnPadding;
                // Create callback function stack if it does not exist.
                // Add function that will be executed post render of the chart and
                // create the UI
                (hcJSON.callbacks || (hcJSON.callbacks = [])).push(iapi.drawButtons);
                return iapi.placeVerticalXYSpaceManager.apply(this, arguments);
            },

            //draw the buttons
            drawButtons: function() {
                var chart = this,
                    logic = chart.logic,
                    paper = chart.paper,
                    options = chart.options.chart,
                    btnPadding = options.btnPadding,
                    btnSpacing = options.btnSpacing,
                    btnTop = chart.chartHeight - options.spacingBottom + btnPadding,
                    btnLeft = chart.chartWidth - options.spacingRight,
                    aboveDataset = chart.layers.layerAboveDataset,
                    formBtnWidthTaken = 0,
                    submitBtn,
                    restoreBtn;
                //draw submit button
                if (options.showFormBtn) {
                    submitBtn = chart.submitBtn = paper.button(
                        btnLeft - options.formBtnWidth,
                        btnTop,
                        options.formBtnTitle,
                        UNDEFINED, {
                            width: options.formBtnWidth,
                            height: options.btnHeight,
                            verticalPadding: 1,
                            horizontalPadding: 15
                        }, aboveDataset)
                        .labelcss(options.formBtnStyle)
                        .attr({
                            fill: [getFirstColor(options.formBtnBgColor), options.formBtnLabelFill],
                            stroke: getFirstColor(options.formBtnBorderColor)
                        })
                        .buttonclick(function() {
                            logic.chartInstance.submitData();
                        });
                    formBtnWidthTaken = options.formBtnWidth + btnSpacing;
                }
                //draw restore button
                if (options.showRestoreBtn) {
                    restoreBtn = chart.restoreBtn = paper.button(
                        btnLeft - options.restoreBtnWidth - formBtnWidthTaken,
                        btnTop,
                        options.restoreBtnTitle,
                        UNDEFINED, {
                            width: options.restoreBtnWidth,
                            height: options.btnHeight,
                            verticalPadding: 1,
                            horizontalPadding: 15
                        }, aboveDataset)
                        .labelcss(options.restoreBtnStyle)
                        .attr({
                            fill: [getFirstColor(options.restoreBtnBgColor), options.restoreBtnLabelFill],
                            stroke: getFirstColor(options.restoreBtnBorderColor)
                        })
                        .buttonclick(function() {
                            logic.chartInstance.restoreData();
                        });
                }
            },

            drawAxisUpdateUI: function() {
                var chart = this,
                    logic = chart.logic,
                    elements = chart.elements,
                    hc = chart.options,
                    chartDef = hc.chart,
                    conf = hc[CONFIGKEY],
                    chartInstance = logic.chartInstance,
                    renderer = logic.renderer,
                    yAxis = chart.yAxis[0],
                    yAxisDef = yAxis.axisData,
                    poi = yAxis.poi,
                    plotLinesAndBands = yAxisDef.plotLines,
                    container = chart.container,
                    optionsChart = hc.chart,
                    showRangeError = optionsChart.showRangeError,
                    inCanvasStyle = conf.inCanvasStyle,
                    toolbar = chart.toolbar || (chart.toolbar = []),
                    menus = chart.menus || (chart.menus = []),
                    inputStyle = extend({
                        outline: NONE, // prevent chrome outlining
                        '-webkit-appearance': NONE, // disable ios background
                        filter: 'alpha(opacity=0)', // IE opacity
                        position: 'absolute',
                        background: 'transparent',
                        border: '1px solid #cccccc',
                        textAlign: 'right',
                        top: 0,
                        left: 0,
                        width: 50,
                        zIndex: 20,
                        opacity: 0,
                        borderRadius: 0
                    }, inCanvasStyle),
                    limitUpdateMenu,
                    doAxisUpdate;

                // Do not proceed if the renderer is for Export
                if (!(renderer && !renderer.forExport)) {
                    return;
                }

                // Create function that executes axis update function and also shows
                // message on failure
                doAxisUpdate = function(value, oldvalue, isMax) {
                    var success;
                    // do not update if value has not changed
                    if (value === oldvalue + '') {
                        return null;
                    }

                    success = isMax ?
                        chartInstance.setUpperLimit(value, true) :
                        chartInstance.setLowerLimit(value, true);

                    if (!success && showRangeError) {
                        chart.showMessage('Sorry! Not enough range gap to modify axis limit to ' +
                            (Number(value) || '0') +
                            '.<br />Please modify the data values to be within range.<br />&nbsp;<br />' +
                            '(click anywhere on the chart to close this message)', true);
                    }

                    return success;
                };

                each(['max', 'min'], function(value) {
                    var poiObj = poi[value],
                        label = poiObj.label,
                        options = plotLinesAndBands[poiObj.index],
                        box = label && label.getBBox(),
                        inputElement,
                        inputWidth,
                        inputLeft,
                        item,
                        hasFocus,
                        defaultAction,
                        justFocussed;

                    // Take precaution to ensure that we do not do any computation
                    // in case chart is destroyed.
                    if (!(box && label)) {
                        return;
                    }

                    // Decide the width and position of inputbox.
                    inputWidth = box.x + box.width - chartDef.spacingLeft;
                    inputLeft = chartDef.marginLeft - inputWidth - (hasSVG ? 4 : 5);

                    // Create the input-box element and provide its initial attrs
                    // and styling.
                    inputElement = createElement(
                        'input', {
                            type: 'text',
                            value: options.value
                        }, container, true
                    );

                    extend(inputStyle, {
                        top: (box.y + (hasSVG ? -1 : 0)) + PX,
                        left: inputLeft + PX,
                        width: inputWidth + PX
                    });
                    for (item in inputStyle) {
                        inputElement.style[item] = inputStyle[item];
                    }
                    // Add events to make the textboxes visible on focus and hide
                    // when not.
                    lib.dem.listen(inputElement, ['focus', 'mouseup', 'blur', 'keyup'], [

                        function() {
                            var ele = this,
                                styleObj = {
                                    opacity: 1,
                                    filter: 'alpha(opacity=100)', // IE opacity
                                    color: inCanvasStyle.color
                                },
                                item;

                            ele.value = options.value;

                            for (item in styleObj) {
                                ele.style[item] = styleObj[item];
                            }

                            justFocussed = true;
                            hasFocus = true;
                            label.hide();
                        },
                        function() {
                            var ele = this;
                            if (justFocussed) {
                                justFocussed = false;
                                if (!hasTouch) {
                                    setTimeout(function() {
                                        ele.select();
                                    }, 0);
                                }
                            }
                        },
                        function() {
                            var ele = this,
                                value = ele.value,
                                success = doAxisUpdate(value, options.value,
                                    options.isMaxLabel);

                            if (success !== true) {
                                ele.style.opacity = 0;
                                ele.style.filter = 'alpha(opacity=0)'; // IE opacity
                                label.show();
                            }

                            if (isIE) {
                                // To call the actual blur on the element in case of IE
                                doc.getElementsByTagName('body')[0].focus &&
                                 doc.getElementsByTagName('body')[0].focus();
                            }

                            justFocussed = false;
                            hasFocus = false;
                        },
                        function(e) {
                            var ele = this,
                                keyCode = e.originalEvent.keyCode,
                                value = ele.value,
                                success;

                            if (keyCode === 13) {
                                success = doAxisUpdate(value, options.value,
                                    options.isMaxLabel);
                                if (success === false) {
                                    ele.style.color = '#dd0000';
                                }
                            } else if (keyCode === 27) {
                                ele.value = options.value;
                                lib.dem.fire(ele, 'blur', e);
                            }
                        }
                    ]);

                    // Mark it for no event prevention
                    inputElement.setAttribute('isOverlay', 'true');

                    // When out of textbox is clicked, we need to emulate blur event.
                    // This is because the container grabs the mousedown event for
                    // better UX.
                    if (hasSVG) {
                        addEvent(chart, 'defaultprevented', defaultAction = function(e) {
                            if (inputElement.parentNode) {
                                lib.dem.fire(inputElement, 'blur', e);
                            }
                        });
                        // cleanup
                        addEvent(chart, 'destroy', function() {
                            removeEvent(chart, 'defaultprevented', defaultAction);
                            inputElement.parentNode.removeChild(inputElement);
                        });
                    } else {
                        addEvent(chart.container, 'mousedown', defaultAction = function(e) {
                            if (e.srcElement !== inputElement && hasFocus) {
                                lib.dem.fire(inputElement, 'blur', e);
                            }
                        });
                        // cleanup
                        addEvent(chart, 'destroy', function() {
                            removeEvent(chart.container, 'mousedown', defaultAction);
                            inputElement.parentNode.removeChild(inputElement);
                        });
                    }
                });

                if (chartDef.showLimitUpdateMenu) {
                    menus.push(limitUpdateMenu = createContextMenu({
                        chart: chart,
                        basicStyle: conf.outCanvasStyle,
                        items: [{
                            text: 'Increase Upper Limit',
                            onclick: function() {
                                chartInstance.setUpperLimit(yAxisDef.max +
                                    yAxisDef.tickInterval, true);
                            }
                        }, {
                            text: 'Increase Lower Limit',
                            onclick: function() {
                                chartInstance.setLowerLimit(yAxisDef.min +
                                    yAxisDef.tickInterval, true);
                            }
                        }, {
                            text: 'Decrease Upper Limit',
                            onclick: function() {
                                chartInstance.setUpperLimit(yAxisDef.max -
                                    yAxisDef.tickInterval, true);
                            }
                        }, {
                            text: 'Decrease Lower Limit',
                            onclick: function() {
                                chartInstance.setLowerLimit(yAxisDef.min -
                                    yAxisDef.tickInterval, true);
                            }
                        }],
                        position: {
                            x: chartDef.spacingLeft,
                            y: chartInstance.height - chartDef.spacingBottom +
                                (!chartDef.showFormBtn && !chartDef.showRestoreBtn ? -15 : 10)
                        }
                    }));

                    elements.configureButton = toolbar.add('configureIcon', (function(x, y) {
                        return function() {
                            if (limitUpdateMenu.visible) {
                                limitUpdateMenu.hide();
                                return;
                            }
                            limitUpdateMenu.show({
                                x: x,
                                y: y + 1
                            });
                        };
                    }()), {
                        x: chartDef.spacingLeft,
                        y: chartInstance.height - chartDef.spacingBottom +
                            (!chartDef.showFormBtn && !chartDef.showRestoreBtn ? -15 : 10),
                        tooltip: 'Change Y-Axis Limits'
                    });
                }
            },

            getCollatedData: function() {
                var api = this,
                    fcObj = api.chartInstance,
                    state = fcObj.__state,
                    vars = fcObj.jsVars,
                    origChartData = api.updatedDataObj ||
                        extend2({}, fcObj.getChartData(global.dataFormats.JSON)),
                    reflowData = vars._reflowData,
                    origDataSets = origChartData.dataset,
                    updatedData = (reflowData && reflowData.hcJSON &&
                        reflowData.hcJSON.series),
                    i = (updatedData && updatedData.length),
                    j,
                    origSet,
                    updatedSet,
                    dataItem;

                if (state.hasStaleData !== undefined && !state.hasStaleData &&
                    api.updatedDataObj) {
                    return api.updatedDataObj;
                }

                if (origDataSets && updatedData) {
                    while (i--) {
                        origSet = (origDataSets[i] && origDataSets[i].data);
                        updatedSet = (updatedData[i] && updatedData[i].data);
                        j = (updatedSet && updatedSet.length);
                        if (j && origSet) {
                            while (j--) {
                                dataItem = updatedSet[j];
                                if (dataItem) {
                                    origSet[j].value = dataItem.y;
                                }
                            }
                        }
                    }
                }

                state.hasStaleData = false;
                return (api.updatedDataObj = origChartData);
            },

            eiMethods: /** @lends FusionCharts# */ {
                restoreData: function() {
                    var vars = this.jsVars,
                        iChart = vars.fcObj;

                    // Delete reflow-data that has all drag related stuffs and
                    // simply redraw the chart.
                    vars._reflowData = {};
                    //delete _reflowClean
                    delete vars._reflowClean;
                    global.hcLib.createChart(iChart, vars.container, vars.type,
                        undefined, undefined, false, true);

                    /**
                     * For interative charts like `Select Scatter`, `DragNode`, `Dragable Column2D ` and etc., data
                     * points value can be selected for `Scatter Chart` and values can be changed for dragable charts by
                     * clicking and dragging the data points whose data point values can be sent to an URL by ajax POST.
                     * This event is raised when `Restore` button is clicked which resets all the changes that been done
                     * to the data points.
                     *
                     * @event FusionCharts#dataRestored
                     * @group chart-powercharts
                     */
                    lib.raiseEvent('dataRestored', {}, iChart, [iChart.id]);
                    return true;

                },

                submitData: function() {
                    var vars = this.jsVars,
                        fcObj = vars.fcObj,
                        state = fcObj.__state,
                        ajaxObj = state._submitAjaxObj || (state._submitAjaxObj = new global.ajax()),
                        json = global.dataFormats.JSON,
                        csv = global.dataFormats.CSV,
                        xml = global.dataFormats.XML,
                        iapi = vars.instanceAPI,
                        hcJSON = iapi.hcJSON,
                        chart = hcJSON.chart,
                        url = chart.formAction,
                        submitAsAjax = chart.submitFormAsAjax,
                        requestType,
                        data,
                        paramObj,
                        tempSpan,
                        formEle;

                    if (chart.formDataFormat === json) {
                        requestType = json;
                        data = JSON.stringify(iapi.getCollatedData());
                    } else if (chart.formDataFormat === csv) {
                        requestType = csv;
                        data = iapi.getCSVString && iapi.getCSVString();
                        if (data === undefined) {
                            data = global.core.transcodeData(iapi.getCollatedData(), json, csv);
                        }
                    } else {
                        requestType = xml;
                        data = global.core.transcodeData(iapi.getCollatedData(), json, xml);
                    }

                    // cancel data submit function added in event options
                    /**
                     * For interative charts like `Select Scatter`, `DragNode`, `Dragable Column2D ` and etc., data
                     * points value can be selected for `Scatter Chart` and values can be changed for dragable charts by
                     * clicking and dragging the data points whose data point values can be sent to an URL by ajax POST.
                     * This is the first event raised when `Submit` button is clicked where the current chart data is
                     * about to be sent to the set URL.
                     *
                     * @event FusionCharts#beforeDataSubmit
                     * @group chart-powercharts
                     *
                     * @param {string} data - Contains the XML string with complete chart data at it's current state.
                     *
                     */
                    global.raiseEvent('beforeDataSubmit', {
                        data: data
                    }, fcObj, undefined, function() {
                        // After the collation is done, we have to submit the data using
                        // ajax or form submit method.
                        if (!submitAsAjax) {
                            // Create a hidden form with data inside it.
                            tempSpan = win.document.createElement('span');
                            tempSpan.innerHTML = '<form style="display:none" action="' +
                                url + '" method="' + chart.formMethod + '" target="' + chart.formTarget +
                                '"> <input type="hidden" name="strXML" value="' +
                                xssEncode(data) + '"><input type="hidden" name="dataFormat" value="' +
                                requestType.toUpperCase() + '" /></form>';

                            formEle = tempSpan.removeChild(tempSpan.firstChild);

                            // Append the form to body and then submit it.
                            win.document.body.appendChild(formEle);
                            formEle.submit && formEle.submit();
                            // cleanup
                            formEle.parentNode.removeChild(formEle);
                            tempSpan = formEle = null;
                        }
                        else {
                            ajaxObj.onError = function(response, wrapper, ajaxData, url) {
                            /**
                             * For interative charts like `Select Scatter`, `DragNode`, `Dragable Column2D ` and etc.,
                             * data points value can be selected for `Scatter Chart` and values can be changed for
                             * dragable charts by clicking and dragging the data points whose data point values can be
                             * sent to an URL by ajax POST. This event is raised if there is an ajax error in sending
                             * the chart XML data.
                             *
                             * @event FusionCharts#dataSubmitError
                             * @group chart-powercharts
                             *
                             * @param {string} data - Contains the XML string with complete chart data.
                             * @param {number} httpStatus - Tells the status code of the ajax POST request
                             * @param {string} statusText - Contains the ajax error message.
                             * @param {string} url - URL to which the data is sent as ajax POST request.
                             * @param {object} xhrObject - XMLHttpRequest object which takes care of sending the XML
                             * chart data. In case of error, this object won't be defined.
                             */
                                lib.raiseEvent('dataSubmitError', {
                                    xhrObject: wrapper.xhr,
                                    url: url,
                                    statusText: response,
                                    httpStatus: (wrapper.xhr && wrapper.xhr.status) ?
                                        wrapper.xhr.status : -1,
                                    data: data
                                }, fcObj, [fcObj.id, response, wrapper.xhr && wrapper.xhr.status]);
                            };

                            ajaxObj.onSuccess = function(response, wrapper, ajaxData, url) {
                            /**
                             * For interative charts like `Select Scatter`, `DragNode`, `Dragable Column2D ` and etc.,
                             * data points value can be selected for `Scatter Chart` and values can be changed for
                             * dragable charts by clicking and dragging the data points whose data point values can be
                             * sent to an URL by ajax POST. This event is raised when the ajax POST request is
                             * successfully completed.
                             *
                             * @event FusionCharts#dataSubmitted
                             * @group chart-powercharts
                             *
                             * @param {string} data - Contains the XML string with complete chart data.
                             * @param {string} reponse - Contains the reponse returned by the web server to which the
                             * HTTP POST request was submitted.
                             * @param {string} url - URL to which the data is sent as HTTP POST request.
                             * @param {object} xhrObject - XMLHttpRequest object which takes care of sending the XML
                             * chart data
                             */
                                lib.raiseEvent('dataSubmitted', {
                                    xhrObject: ajaxObj,
                                    response: response,
                                    url: url,
                                    data: data
                                }, fcObj, [fcObj.id, response]);
                            };

                            paramObj = {};
                            paramObj['str' + requestType.toUpperCase()] = data;

                            if (ajaxObj.open) {
                                ajaxObj.abort();
                            }
                            ajaxObj.post(url, paramObj);
                        }
                    }, function() {
                        /**
                         * For interative charts like `Select Scatter`, `DragNode`, `Dragable Column2D ` and etc.,
                         * data points value can be selected for `Scatter Chart` and values can be changed for
                         * dragable charts by clicking and dragging the data points whose data point values can be
                         * sent to an URL by ajax POST. This event is raised when `preventDefault()` method is called
                         * from the `eventObject` of FusionCharts#beforeDataSubmit event.
                         *
                         * @event FusionCharts#dataSubmitCancelled
                         * @group chart-powercharts
                         *
                         * @param {string} data - Contains the XML string with complete chart data.
                         * @param {number} httpStatus - Tells the status code of the ajax POST request
                         * @param {string} statusText - Contains the ajax error message.
                         * @param {string} url - URL to which the data is sent as ajax POST request.
                         * @param {object} xhrObject - XMLHttpRequest object which takes care of sending the XML
                         * chart data. In case of error, this object won't be defined.
                         * @example
                         * FusionCharts.addEventListener('beforeDataSubmit', function(eventObject, parameterObject) {
                         *   eventObject.preventDefault();
                         * }
                         */
                        global.raiseEvent('dataSubmitCancelled', {
                            data: data
                        }, fcObj);
                    });
                },

                getDataWithId: function() {
                    // create a two dimensional array as given in the docs
                    var vars = this.jsVars,
                        iapi = vars.instanceAPI,
                        dataObj = iapi.getCollatedData(),
                        returnObj = [
                            [BLANK]
                        ],
                        datasets = dataObj.dataset,
                        catArr = (dataObj.categories && dataObj.categories[0] &&
                            dataObj.categories[0].category),
                        i = (datasets && datasets.length) || 0,
                        vLinePassed = 0,
                        setArr,
                        catName,
                        catObj,
                        set,
                        DS,
                        item,
                        dsID,
                        id,
                        j,
                        ln;

                    while (i--) {
                        DS = datasets[i];
                        if (DS) {
                            returnObj[0][i + 1] = DS.id || DS.seriesname;
                            dsID = DS.id || (i + 1);
                            set = DS.data;
                            ln = (set && set.length) || 0;
                            for (j = 0; j < ln; j += 1) {
                                item = j + 1;
                                if (!returnObj[item]) {
                                    catObj = (catArr && catArr[j + vLinePassed]) || {};
                                    while (catObj.vline) {
                                        vLinePassed += 1;
                                        catObj = catArr[j + vLinePassed] || {};
                                    }
                                    catName = catObj.label || catObj.name || BLANK;
                                    returnObj[item] = [catName];
                                }
                                setArr = returnObj[item];
                                id = set[j].id || (item + '_' + dsID);
                                setArr[i + 1] = [id, Number(set[j].value)];
                            }
                        }
                    }

                    return returnObj;
                },

                getData: function(format) {
                    // create a two dimensional array as given in the docs
                    var vars = this.jsVars,
                        iapi = vars.instanceAPI,
                        dataObj = iapi.getCollatedData(),
                        returnObj = [
                            [BLANK]
                        ],
                        datasets = dataObj.dataset,
                        catArr = (dataObj.categories && dataObj.categories[0] &&
                            dataObj.categories[0].category),
                        i = (datasets && datasets.length) || 0,
                        vLinePassed = 0,
                        catObj,
                        setArr,
                        catName,
                        set,
                        item,
                        ln,
                        j;

                    // When a format is provided
                    if (format) {
                        // no transcoding needed for json
                        if (/^json$/ig.test(format)) {
                            returnObj = dataObj;
                        } else {
                            returnObj = global.core.transcodeData(dataObj,
                                'json', format);
                        }
                    }
                    // if no format has been specified, return data as 2d array.
                    else {
                        while (i--) {
                            set = datasets[i];
                            if (set) {
                                returnObj[0][i + 1] = datasets[i].seriesname;

                                set = datasets[i] && datasets[i].data;
                                ln = (set && set.length) || 0;
                                for (j = 0; j < ln; j += 1) {
                                    item = j + 1;
                                    if (!returnObj[item]) {
                                        catObj = (catArr && catArr[j + vLinePassed]) || {};
                                        while (catObj.vline) {
                                            vLinePassed += 1;
                                            catObj = catArr[j + vLinePassed] || {};
                                        }
                                        catName = catObj.label || catObj.name || BLANK;
                                        returnObj[item] = [catName];
                                    }
                                    setArr = returnObj[item];
                                    setArr[i + 1] = Number(set[j].value);
                                }
                            }
                        }
                    }

                    return returnObj;
                },

                setYAxisLimits: function(upper, lower) {
                    var vars = this.jsVars,
                        iapi = vars.instanceAPI,
                        hcJSON = iapi.hcJSON,
                        dataObj = iapi.dataObj,
                        chartAttr = dataObj && dataObj.chart || {},
                        yAxis = (hcJSON && hcJSON.yAxis && hcJSON.yAxis[0]) || false,
                        limitchanged = false;
                    chartAttr.animation = false;

                    if (!yAxis) {
                        return false;
                    }

                    if ((upper !== undefined) && upper > iapi.highValue && upper !== yAxis.max) {
                        chartAttr.yaxismaxvalue = upper;
                        limitchanged = true;
                    } else {
                        upper = iapi.highValue > yAxis.max ? iapi.highValue : yAxis.max;
                        chartAttr.yaxismaxvalue = upper;
                    }

                    if ((lower !== undefined) && lower < iapi.lowValue && lower !== yAxis.min) {
                        chartAttr.yaxisminvalue = lower;
                        limitchanged = true;
                    } else {
                        lower = iapi.lowValue < yAxis.min ? iapi.lowValue : yAxis.min;
                        chartAttr.yaxisminvalue = lower;
                    }

                    if (limitchanged) {
                        iapi.updateChartWithData(dataObj);
                    }

                    return limitchanged;
                },

                getUpperLimit: function() {
                    var vars = this.jsVars,
                        iapi = vars.instanceAPI,
                        hcJSON = iapi.hcJSON,
                        yAxis = hcJSON.yAxis && hcJSON.yAxis[0];

                    return (yAxis ? yAxis.max : undefined);
                },

                setUpperLimit: function(newLimit) {
                    var ci = this.jsVars.fcObj;
                    return ci.setYAxisLimits(newLimit, undefined);
                },

                getLowerLimit: function() {
                    var vars = this.jsVars,
                        iapi = vars.instanceAPI,
                        hcJSON = iapi.hcJSON,
                        yAxis = hcJSON.yAxis && hcJSON.yAxis[0];

                    return (yAxis ? yAxis.min : undefined);
                },

                setLowerLimit: function(newLimit) {
                    return this.jsVars.fcObj.setYAxisLimits(undefined, newLimit);
                }
            },

            updateChartWithData: function(dataObj) {
                var api = this,
                    chartObj = api.chartInstance,
                    vars = chartObj.jsVars,
                    fcChart = (dataObj && dataObj.chart),
                    reflowData = vars._reflowData || (vars._reflowData = {}),
                    reflowUpdate = {
                        dataObj: {
                            chart: {
                                yaxisminvalue: pluckNumber(fcChart.yaxisminvalue),
                                yaxismaxvalue: pluckNumber(fcChart.yaxismaxvalue),
                                animation: fcChart.animation
                            }
                        }
                    };

                extend2(reflowData, reflowUpdate, true);
                global.hcLib.createChart(chartObj, vars.container, vars.type);
                return;
            },

            preSeriesAddition: function() {
                var iapi = this,
                    fc = iapi.dataObj,
                    hc = iapi.hcJSON,
                    chartAttr = fc.chart,
                    chartOptions = hc.chart,
                    conf = hc[CONFIGKEY];
                iapi.tooltipSepChar = conf.tooltipSepChar;

                //Drag options
                chartOptions.allowAxisChange = pluckNumber(chartAttr.allowaxischange,
                    1);
                chartOptions.changeDivWithAxis = 1;
                chartOptions.snapToDivOnly = pluckNumber(chartAttr.snaptodivonly, 0);
                chartOptions.snapToDiv = chartOptions.snapToDivOnly ? 1 : pluckNumber(chartAttr.snaptodiv, 1);
                chartOptions.snapToDivRelaxation = pluckNumber(
                    chartAttr.snaptodivrelaxation, 10);
                chartOptions.doNotSnap = pluckNumber(chartAttr.donotsnap, 0);
                //If no snapping then we set default to all snapping parameters to 0
                if (chartOptions.doNotSnap) {
                    chartOptions.snapToDiv = chartOptions.snapToDivOnly = 0;
                }

                // Configuration to suppress display of error message when out of
                // range.
                chartOptions.showRangeError = pluckNumber(chartAttr.showrangeerror, 0);

                // Create callback function stack if it does not exist.
                // Add function that will be executed post render of the chart and
                // create the UI
                if (pluckNumber(chartAttr.allowaxischange, 1)) {
                    (hc.callbacks || (hc.callbacks = [])).push(function(chart) {
                        var scope = this,
                            args = arguments,
                            proxy = function() {
                                iapi.drawAxisUpdateUI.apply(scope, args);
                                interrupt = null;
                            },
                            interrupt;

                        // In case a super-fast destroy occurs, we need to cancel
                        // the original timeout.
                        addEvent(chart, 'destroy', function() {
                            if (interrupt) {
                                interrupt = clearTimeout(interrupt);
                            }
                        });
                        interrupt = setTimeout(proxy, 1);
                    });
                }
            },

            // Function to create ponit specific tooltext creator
            getTooltextCreator: function() {
                var catchedArg = arguments;
                return function () {
                    var arg = arguments,
                        l = arg.length,
                        obj1,
                        obj2,
                        i;
                    for (i = 0; i < l; i += 1) {
                        if ((obj2 = arg[i]) !== undefined && (obj1 = catchedArg[i]) !== undefined) {
                            if (typeof obj1 === OBJECTSTRING) {
                                catchedArg[i] = extend2(obj1, obj2);
                            }
                            else {
                                catchedArg[i] = obj2;
                            }
                        }
                    }
                    return parseTooltext.apply(this, catchedArg);
                };
            },

            // Function to create tooltext for individual data points
            getPointStub: function(setObj, value, label, HCObj, dataset, datasetShowValues, yAxisIndex) {
                var iapi = this,
                    isDual = iapi.isDual,
                    dataObj = iapi.dataObj,
                    FCCHartObj = dataObj.chart,
                    HCConfig = HCObj[CONFIGKEY],
                    isSY = yAxisIndex === 1 ? true : false,
                    formatedVal = value === null ? value : HCConfig.numberFormatter
                        .dataLabels(value, isSY),
                    setTooltext = getValidValue(parseUnsafeString(pluck(setObj.tooltext, dataset.plottooltext,
                        HCConfig.tooltext))),
                    tooltipSepChar = HCConfig.tooltipSepChar,
                    _sourceDataset = dataset._sourceDataset,
                    allowDrag = pluckNumber(setObj.allowdrag,
                        _sourceDataset.allowdrag, 1),
                    allowNegDrag = pluckNumber(setObj.allownegativedrag,
                        _sourceDataset.allownegativedrag, dataset.allownegativedrag, 1),
                    showPercentInToolTipRequared,
                    showPercentValuesRequared,
                    displayValue,
                    seriesname,
                    toolText,
                    isUserTooltip = 0,
                    isUserValue = 0,
                    toolTextStr,
                    dataLink,
                    getTooltext;

                //create the tooltext
                if (!HCConfig.showTooltip) {
                    toolText = false;
                }
                // if tooltext is given in data object
                else if (setTooltext !== undefined) {
                    getTooltext = iapi.getTooltextCreator(setTooltext, [1,2,3,4,5,6,7], {
                        yaxisName: parseUnsafeString(isDual? (yAxisIndex ? FCCHartObj.syaxisname :
                            FCCHartObj.pyaxisname) : FCCHartObj.yaxisname),
                        xaxisName: parseUnsafeString(FCCHartObj.xaxisname),
                        formattedValue: formatedVal,
                        label: label
                    }, setObj, FCCHartObj, dataset);
                    toolText = getTooltext();
                    if (toolText === setTooltext) {
                        getTooltext = undefined;
                        isUserTooltip = 1;
                    }
                } else { //determine the tooltext then
                    if (formatedVal === null) {
                        toolText = false;
                    } else {
                        if (HCConfig.seriesNameInToolTip) {
                            seriesname = getFirstValue(dataset &&
                                dataset.seriesname);
                        }
                        toolText = seriesname ? seriesname + tooltipSepChar :
                            BLANK;
                        toolText += label ? label + tooltipSepChar : BLANK;
                        toolTextStr = toolText;
                        if (HCConfig.showPercentInToolTip) {
                            showPercentInToolTipRequared = true;
                        } else {
                            toolText += formatedVal;
                        }
                    }
                }

                //create the displayvalue
                if (!pluckNumber(setObj.showvalue, datasetShowValues)) {
                    displayValue = BLANK;
                } else if (getValidValue(setObj.displayvalue) !== undefined) {
                    displayValue = parseUnsafeString(setObj.displayvalue);
                    isUserValue = 1;
                } else if (HCConfig.showPercentValues) {
                    showPercentValuesRequared = true;
                } else { //determine the dispalay value then
                    displayValue = formatedVal;
                }

                ////create the link
                dataLink = pluck(setObj.link);

                return {
                    displayValue: displayValue,
                    categoryLabel: label,
                    toolText: toolText,
                    link: dataLink,
                    showPercentValues: showPercentValuesRequared,
                    showPercentInToolTip: showPercentInToolTipRequared,
                    allowDrag: allowDrag,
                    allowNegDrag: allowNegDrag,
                    _toolTextStr: toolTextStr,
                    _isUserValue: isUserValue,
                    _isUserTooltip: isUserTooltip,
                    _getTooltext: getTooltext
                };
            }
        };

        /* Drag Node Chart */
        /////////////// DragArea ///////////
        //Local function to redraw dragnode after add/update of any element
        function redrawDragNode(vars, eventArgs, sourceEvent) {
            var iChart = vars.fcObj;

            // simply redraw the chart.
            global.hcLib.createChart(iChart, vars.container, vars.type,
                undefined, undefined, false, true);

            /**
             * The interactive charts charts from the FusionCharts suite fire this event when the attributes of its data
             * plots are updated due to user interaction. For example, when any node of a `dragnode` chart is moved,
             * this event us fired.
             *
             * Note that when user restores any modification using the "Restore" button on these charts, the
             * {@link FusionCharts#event:dataRestored} is fired and not this event.
             *
             * Applicable charts: `dragnode`, `dragcolumn2d`, `dragline`, `dragarea` and `selectscatter`.
             *
             * @event FusionCharts#chartUpdated
             * @group chart-powercharts
             *
             * @param {number} datasetIndex - The index of the dataset
             * @param {string} datasetName - Name of the dataset
             * @param {number} index - Index of the node by the order which it was created
             *
             * @param {number} chartX - The relative X-Cordinate to chart container where the node was dropped.
             * > Applicable to `dragnode` chart only.
             *
             * @param {number} chartY - The relative Y-Cordinate to chart container where the node was dropped.
             * > Applicable to `dragnode` chart only.
             *
             * @param {number} pageX - Relative X-Cordinate to screen where the node was dropped
             * > Applicable to `dragnode` chart only.
             *
             * @param {number} pageY - Relative X-Cordinate to screen where the node was dropped
             * > Applicable to `dragnode` chart only.
             *
             * @param {number} id - Number assigned to the node
             * > Applicable to `dragnode` chart only.
             *
             * @param {string} label - Label assigned to the node for identifying it and can be used to display it for
             * toolText
             * > Applicable to `dragnode` chart only.
             *
             * @param {string} link - URL linked to a node when clicked will be taken to that URL
             * > Applicable to `dragnode` chart only.
             *
             *
             * @param {number} radius - A Node's circumcircle radius if it is a polygon or simply the radius if the
             * node's shape is a circle
             * > Applicable to `dragnode` chart only.
             *
             * @param {string} shape - Shape of the node.
             * > Applicable to `dragnode` chart only.
             *
             * @param {number} sides - It is the number of sides of the node if it is a polygon or 'undefined' if it is
             * a circle.
             * > Applicable to `dragnode` chart only.
             *
             * @param {string} toolText - Tooltext defined for the node.
             * > Applicable to `dragnode` chart only.
             *
             * @param {number} x - The updated value of the node.
             * > Applicable to `dragnode` chart only.
             *
             * @param {number} y - The updated value of the node.
             * > Applicable to `dragnode` chart only.
             *
             * @param {number} startValue - The value of the plot previous to being updated.
             * > Applicable to `dragcolumn2d`, `dragline` and `dragarea` charts only
             *
             * @param {number} endValue - The value of the plot after being dragged and updated.
             * > Applicable to `dragcolumn2d`, `dragline` and `dragarea` charts only
             */
            lib.raiseEvent('chartUpdated', extend2({
                sourceEvent: sourceEvent
            }, eventArgs), iChart, [iChart.id]);
        }

        chartAPI('dragnode', {
            friendlyName: 'Dragable Node Chart',
            standaloneInit: true,
            decimals: 2,
            numdivlines: 0,
            numVDivLines: 0,
            defaultZeroPlaneHighlighted: false,
            defaultZeroPlaneHidden: true,
            spaceManager: dragExtension.spaceManager,
            drawButtons: dragExtension.drawButtons,
            //defaultRestoreButtonVisible: 0,
            updateChartWithData: dragExtension.updateChartWithData,
            creditLabel: creditLabel,
            canvasPaddingModifiers: null,
            defaultSeriesType: 'dragnode',
            rendererId: 'dragnode',
            tooltipsepchar: ' - ',
            showAxisLimitGridLines: 0,
            /****   Helper to delet node *****/
            cleanedData: function(oriObj, cleanObj) {
                var oriJSON = oriObj && oriObj.hcJSON,
                    cleanJSON = cleanObj && cleanObj.hcJSON,
                    oriCnts,
                    oriSeri,
                    cnts,
                    seri,
                    csl,
                    ll,
                    sl,
                    dl,
                    cl,
                    i,
                    j;
                //connectors
                if (oriJSON && cleanJSON) {
                    //clean data
                    if (oriJSON.series && cleanJSON.series && (sl = cleanJSON.series.length)) {
                        for (i = 0; i < sl; i += 1) {
                            seri = cleanJSON.series[i];
                            oriSeri = oriJSON.series[i];
                            if (seri.data && (dl = seri.data.length)) {
                                for (j = 0; j < dl; j += 1) {
                                    if (seri.data[j] === true && oriSeri && oriSeri.data && oriSeri.data[j]) {
                                        delete oriSeri.data[j];
                                        //add a null point
                                        oriSeri.data[j] = {
                                            y: null
                                        };
                                    }
                                }
                            }
                        }
                    }
                    //clean connectors
                    if (oriJSON.connectors && cleanJSON.connectors && (csl = cleanJSON.connectors.length)) {
                        for (i = 0; i < csl; i += 1) {
                            cnts = cleanJSON.connectors[i];
                            oriCnts = oriJSON.connectors[i];
                            if (cnts.connector && (cl = cnts.connector.length)) {
                                for (j = 0; j < cl; j += 1) {
                                    if (cnts.connector[j] === true && oriCnts && oriCnts.connector &&
                                        oriCnts.connector[j]) {
                                        delete oriCnts.connector[j];
                                        //add a null point
                                        oriCnts.connector[j] = {};
                                    }
                                }
                            }
                        }
                    }
                    //clean labels dragableLabels
                    if (oriJSON.dragableLabels && cleanJSON.dragableLabels && (ll = cleanJSON.dragableLabels.length)) {
                        for (i = 0; i < ll; i += 1) {
                            if (cleanJSON.dragableLabels[i] === true && oriJSON.dragableLabels[i]) {
                                delete oriJSON.dragableLabels[i];
                                oriJSON.dragableLabels[i] = {};
                            }
                        }
                    }
                }
            },

            eiMethods: extend2(extend(chartAPI.scatterbase.eiMethods,
                dragExtension.eiMethods), /** @lends FusionCharts# */ { //extra methodes for drag node
                //add node
                addNode: function(config) {
                    var vars = this.jsVars,
                        chartApi = vars.instanceAPI,
                        reflowData = vars._reflowData || (vars._reflowData = {}),
                        hcJSON = chartApi.hcJSON,
                        NumberFormatter = chartApi.numberFormatter,
                        datasetId = pluck(config.datasetId),
                        itemValueY = NumberFormatter.getCleanValue(config.y),
                        itemValueX = NumberFormatter.getCleanValue(config.x),
                        idFound = false,
                        series = hcJSON.series,
                        sLn = series.length,
                        xMin = hcJSON.xAxis.min,
                        xMax = hcJSON.xAxis.max,
                        yMin = hcJSON.yAxis[0].min,
                        yMax = hcJSON.yAxis[0].max,
                        reflowUpdate = {
                            hcJSON: {
                                series: []
                            }
                        },
                        reflowSeries = reflowUpdate.hcJSON.series,
                        sourceEvent = 'nodeadded',
                        nodeObj,
                        i,
                        seri,
                        data,
                        index,
                        eventArgs;
                    //if it has valid x and y value and valid datasetId
                    if (datasetId !== undefined && itemValueY !== null &&
                        itemValueY >= yMin && itemValueY <= yMax && itemValueX !== null && itemValueX >= xMin &&
                        itemValueX <= xMax) {

                        for (i = 0; i < sLn && !idFound; i += 1) {
                            if (datasetId == series[i].id) {
                                reflowSeries[i] = {
                                    data: []
                                };
                                idFound = true;
                                seri = series[i];
                                data = seri.data;
                                index = data.length;
                                data.push(nodeObj = seri._dataParser(config,
                                    index, itemValueX, itemValueY));
                                reflowSeries[i].data[index] = nodeObj;
                                extend2(reflowData, reflowUpdate, true);

                                eventArgs = {
                                    index: index, // to be deprecated
                                    dataIndex: index,
                                    link: config.link,
                                    y: config.y,
                                    x: config.x,
                                    shape: config.shape,
                                    width: config.width,
                                    height: config.height,
                                    radius: config.radius,
                                    sides: config.sides,
                                    label: config.name,
                                    toolText: config.tooltext,
                                    id: config.id,
                                    datasetIndex: i,
                                    datasetName: seri.name,
                                    sourceType: 'dataplot'
                                };
                            }
                        }
                        if (idFound) { //resize the chart
                            redrawDragNode(vars, eventArgs, sourceEvent);
                            /**
                             * In `DragNode` charts, data points are represented as nodes whose
                             * properties like location(x,y), shape, dimensions and color can be added dynamically to
                             * the chart. Chart can contain any number of datasets and an index number is assigned to
                             * each dataset based upon order of dataset creation. This event is raised when a node is
                             * added by clicking on the menu button located at the left side bottom of the chart by
                             * default but can the menu button location can be changed.
                             *
                             * This event is only applicable to DragNode chart.
                             *
                             * @event FusionCharts#nodeAdded
                             * @group chart-powercharts:dragnode
                             *
                             * @param {number} datasetIndex - Index of the dataset to which the newly added
                             * node belongs to.
                             * @param {string} datasetName - Name of the dataset to which the node was added. Name of
                             * the dataset can be defined by the attribute `seriesName` for `dataset` tag in the chart
                             * data.
                             * @param {number} dataIndex - Index of the newly added node.
                             *
                             * @param {number} height - Height of the shape represented by the newly added node.
                             * @param {string} id - ID of the newly added node which can be set using `id` attribute
                             * for `set` tag.
                             *
                             * @param {string} label - Text displayed inside the shape of the newly added node.
                             * @param {string} link - URL associated with the newly added node.
                             * @param {number} radius - Radius of the circumcirle for the shape of the
                             * newly added node.
                             * @param {string} shape - Shape of the newly added node.
                             * @param {number} sides - Depending on the shape of the node it is the
                             * number of sides of the polygon. If it is a circle it will have 0 sides.
                             * @param {string} toolText - Text that is displayed over the shape of the
                             * newly added node.
                             * @param {number} width - Width of the shape of the newly added node.
                             * @param {number} x - X Co-ordinate of the newly added node in reference with
                             * the canvas / axis.
                             * @param {number} y - Y Co-ordinate of the newly added node in reference with
                             * the canvas / axis.
                             */
                            global.raiseEvent(sourceEvent, eventArgs, vars.fcObj);
                            return true;
                        }
                        return false;
                    } else {
                        return false;
                    }
                },
                //get node attribute
                getNodeAttribute: function(id) {
                    var vars = this.jsVars,
                        chartApi = vars.instanceAPI,
                        reflowData = vars._reflowData || (vars._reflowData = {}),
                        oldReflowSeries = reflowData.hcJSON && reflowData.hcJSON.series || [],
                        hcJSON = chartApi.hcJSON,
                        idFound = false,
                        series = hcJSON.series,
                        sLn = series.length,
                        i,
                        j,
                        dataLn,
                        seri,
                        data;
                    //if it has valid x and y value and valid datasetId
                    if (id !== undefined) {
                        for (i = 0; i < sLn && !idFound; i += 1) {
                            seri = series[i];
                            data = seri.data;
                            dataLn = data.length;
                            for (j = 0; j < dataLn; j += 1) {
                                if (data[j].id === id) {
                                    //if their has any update in reflow then extend it.
                                    if (oldReflowSeries[i] && oldReflowSeries[i].data &&
                                        oldReflowSeries[i].data[j]) {
                                        return extend2(data[j]._options, oldReflowSeries[i].data[j]._options, true);
                                    }
                                    return data[j]._options;
                                }
                            }
                        }
                    }
                    return false;
                },
                //set node attribute
                setNodeAttribute: function(id, key, value) {
                    var vars = this.jsVars,
                        chartApi = vars.instanceAPI,
                        reflowData = vars._reflowData || (vars._reflowData = {}),
                        hcJSON = chartApi.hcJSON,
                        NumberFormatter = chartApi.numberFormatter,
                        idFound = false,
                        series = hcJSON.series,
                        sLn = series.length,
                        xMin = hcJSON.xAxis.min,
                        xMax = hcJSON.xAxis.max,
                        yMin = hcJSON.yAxis[0].min,
                        yMax = hcJSON.yAxis[0].max,
                        reflowUpdate = {
                            hcJSON: {
                                series: []
                            }
                        },
                        reflowSeries = reflowUpdate.hcJSON.series,
                        oldReflowSeries = reflowData.hcJSON && reflowData.hcJSON.series || [],
                        sourceEvent = 'nodeupdated',
                        nodeObj,
                        itemValueY,
                        itemValueX,
                        i,
                        j,
                        seri,
                        data,
                        dataLn,
                        point,
                        eventArgs,
                        config;

                    if (typeof key === OBJECTSTRING && value === undefined) {
                        config = key;
                    } else {
                        config = {};
                        config[key] = value;
                    }
                    //if it has valid x and y value and valid datasetId
                    if (id !== undefined) {
                        for (i = 0; i < sLn && !idFound; i += 1) {
                            seri = series[i];
                            data = seri.data;
                            dataLn = data.length;
                            for (j = 0; j < dataLn; j += 1) {
                                if (id === data[j].id) {
                                    point = data[j];
                                    //don't allow change of id
                                    delete config.id;
                                    //if their has any reflowCOnf then extend it too
                                    if (oldReflowSeries[i] && oldReflowSeries[i].data &&
                                        oldReflowSeries[i].data[j] && oldReflowSeries[i].data[j]._options) {
                                        config = extend2(oldReflowSeries[i].data[j]._options, config, true);
                                    }
                                    config = extend2(point._options, config, true);
                                    itemValueY = NumberFormatter.getCleanValue(config.y);
                                    itemValueX = NumberFormatter.getCleanValue(config.x);
                                    if (itemValueY !== null && itemValueY >= yMin &&
                                        itemValueY <= yMax && itemValueX !== null &&
                                        itemValueX >= xMin && itemValueX <= xMax) {

                                        reflowSeries[i] = {
                                            data: []
                                        };
                                        nodeObj = seri._dataParser(config,
                                            j, itemValueX, itemValueY);
                                        eventArgs = {
                                            index: j, // to be deprecated
                                            dataIndex: j,
                                            link: config.link,
                                            y: config.y,
                                            x: config.x,
                                            shape: config.shape,
                                            width: config.width,
                                            height: config.height,
                                            radius: config.radius,
                                            sides: config.sides,
                                            label: config.name,
                                            toolText: config.tooltext,
                                            id: config.id,
                                            datasetIndex: i,
                                            datasetName: seri.name,
                                            sourceType: 'dataplot'
                                        };
                                        reflowSeries[i].data[j] = nodeObj;
                                        extend2(reflowData, reflowUpdate, true);
                                        redrawDragNode(vars, eventArgs, sourceEvent);
                                        /**
                                         * In `DragNode` charts, data points are represented as nodes whose
                                         * properties like location(x,y), shape, dimensions and color
                                         * can be modified. Chart can contain any number of datasets and an index
                                         * number is assigned to each dataset based upon order of dataset creation.
                                         * This event is raised when a node is updated by long mouse click on the node
                                         * and by clicking submit button.
                                         *
                                         * This event is only applicable to DragNode chart.
                                         *
                                         * @event FusionCharts#nodeUpdated
                                         * @group chart-powercharts:dragnode
                                         *
                                         * @param {number} datasetIndex - Index of the dataset to which the deleted
                                         * node belongs to.
                                         * @param {string} datasetName - Name of the dataset which can defined by the
                                         * attribute `seriesName` for `dataset` tag in the chart data.
                                         * @param {number} height - Height of the shape represented by the node.
                                         * @param {string} id - ID of the node which can be set using `id` attribute
                                         * for `set` tag.
                                         * @param {number} dataIndex - Index of the updated node.
                                         * @param {string} label - Text displayed inside the shape of the node.
                                         * @param {string} link - URL associated with the deleted node.
                                         * @param {number} radius - Radius of the circumcirle for the shape of the
                                         * node.
                                         * @param {string} shape - Shape of the updated node.
                                         * @param {number} sides - Depending on the shape of the node it is the
                                         * number of sides of the polygon. If it is a circle it will have 0 sides.
                                         * @param {string} toolText - Text that is displayed over the shape of the
                                         * updated node.
                                         * @param {number} width - Width of the shape of the updated node.
                                         * @param {number} x - X Co-ordinate of the updated node in reference with
                                         * the canvas / axis.
                                         * @param {number} y - Y Co-ordinate of the updated node in reference with
                                         * the canvas / axis.
                                         */
                                        global.raiseEvent(sourceEvent, eventArgs, vars.fcObj);
                                        return true;
                                    } else {
                                        return false;
                                    }
                                }
                            }
                        }
                    }
                    return false;
                },
                deleteNode: function(id) {
                    if (id !== undefined) {
                        var vars = this.jsVars,
                            chartApi = vars.instanceAPI,
                            reflowClean = vars._reflowClean || (vars._reflowClean = {}),
                            hcJSON = chartApi.hcJSON,
                            series = hcJSON.series,
                            cleanUpdate = {
                                hcJSON: {
                                    series: []
                                }
                            },
                            sourceEvent = 'nodedeleted',
                            seri,
                            dataLength,
                            data,
                            sLn,
                            i,
                            j,
                            nodeObj,
                            eventArgs;
                        if (series && (sLn = series.length)) {
                            for (i = 0; i < sLn; i += 1) {
                                seri = series[i];
                                if (seri && (data = seri.data) && (dataLength = data.length)) {
                                    for (j = 0; j < dataLength; j += 1) {
                                        if (id === data[j].id) { //id found
                                            //delete the Node
                                            cleanUpdate.hcJSON.series[i] = {
                                                data: []
                                            };
                                            cleanUpdate.hcJSON.series[i].data[j] = true;
                                            extend2(reflowClean, cleanUpdate, true);
                                            nodeObj = data[j];
                                            eventArgs = {
                                                index: j,
                                                dataIndex: j,
                                                link: nodeObj.link,
                                                y: nodeObj.y,
                                                x: nodeObj.x,
                                                shape: nodeObj._options.shape,
                                                width: nodeObj._options.width,
                                                height: nodeObj._options.height,
                                                radius: nodeObj._options.radius,
                                                sides: nodeObj._options.sides,
                                                label: nodeObj.displayValue,
                                                toolText: nodeObj.toolText,
                                                id: nodeObj.id,
                                                datasetIndex: i,
                                                datasetName: seri.name,
                                                sourceType: 'dataplot'
                                            };
                                            redrawDragNode(vars, eventArgs, sourceEvent);
                                            /**
                                             * In `DragNode` charts, data points are represented as nodes whose
                                             * properties like location(x,y), shape, dimensions and color
                                             * can be set. Chart can contain any number of datasets and an index
                                             * number is assigned to each dataset based upon order of dataset creation.
                                             * This event is raised when a node is deleted by long mouse
                                             * click on the node and by clicking delete button.
                                             *
                                             * This event is only applicable to DragNode chart.
                                             *
                                             * @event FusionCharts#nodeDeleted
                                             * @group chart-powercharts:dragnode
                                             *
                                             * @param {number} datasetIndex - Index of the dataset to which the deleted
                                             * node belongs to.
                                             * @param {string} datasetName - Name of the dataset which can defined by
                                             * the attribute `seriesName` for `dataset` tag in the chart data.
                                             * @param {number} height - Height of the shape represented by the node.
                                             * @param {string} id - ID of the node which can be set using `id` attribute
                                             * for `set` tag.
                                             * @param {number} dataIndex - Index of the node deleted.
                                             * @param {string} label - Text displayed inside the shape of the node.
                                             * @param {string} link - URL associated with the deleted node.
                                             * @param {number} radius - Radius of the circumcirle for the shape of the
                                             * node.
                                             * @param {string} shape - Shape of the deleted node.
                                             * @param {number} sides - Depending on the shape of the node it is the
                                             * number of sides of the polygon. If it is a circle it will have 0 sides.
                                             * @param {string} toolText - Text that is displayed over the shape of the
                                             * deleted node.
                                             * @param {number} width - Width of the shape of the deleted node.
                                             * @param {number} x - X Co-ordinate of the deleted node in reference with
                                             * the canvas / axis.
                                             * @param {number} y - Y Co-ordinate of the deleted node in reference with
                                             * the canvas / axis.
                                             */
                                            global.raiseEvent(sourceEvent, eventArgs, vars.fcObj);
                                            return true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    return false;
                },
                addConnector: function(config) {
                    if (typeof config === OBJECTSTRING) {
                        var vars = this.jsVars,
                            chartApi = vars.instanceAPI,
                            reflowData = vars._reflowData || (vars._reflowData = {}),
                            hcJSON = chartApi.hcJSON,
                            connectors = hcJSON.connectors && hcJSON.connectors[0] || {
                                connector: []
                            },
                            index = connectors.connector.length,
                            reflowUpdate = {
                                hcJSON: {
                                    connectors: [{
                                        connector: []
                                    }]
                                }
                            },
                            connectorObj = connectors._connectorParser && connectors._connectorParser(config, index),
                            sourceEvent = 'connectoradded',
                            eventArgs = {
                                arrowAtEnd: connectorObj.arrowAtEnd,
                                arrowAtStart: connectorObj.arrowAtStart,
                                fromNodeId: connectorObj.from,
                                id: connectorObj.id,
                                label: connectorObj.label,
                                link: connectorObj.connectorLink,
                                sourceType: 'connector',
                                toNodeId: connectorObj.to
                            };
                        reflowUpdate.hcJSON.connectors[0].connector[index] =
                            connectorObj;
                        extend2(reflowData, reflowUpdate, true);
                        redrawDragNode(vars, eventArgs, sourceEvent);
                        /**
                         * In `DragNode` charts, connector is used to link between two nodes. Connectors can be created,
                         * modified and removed. This event is fired when a connector is added.
                         *
                         * This event is only applicable to DragNode chart.
                         *
                         * @event FusionCharts#connectorAdded
                         * @group chart-powercharts:dragnode
                         *
                         * @param {boolean} arrowAtEnd - True if there is an arrow at the
                         *                  end of the link else false.
                         * @param {boolean} arrowAtStart - True if there is an arrow at the
                         *                  start of the link else false.
                         * @param {number} fromNodeId - Contains the index number or the node id
                         *                 from which the link originated.
                         * @param {number} id - ID of the connector.
                         * @param {string} label - Text displayed for the connector that was deleted.
                         * @param {string} link - URL set for the connector on mouse click.
                         * @param {number} toNodeId - Contains the index number or the node id
                         *                 to which the link ends.
                         *
                         */
                        global.raiseEvent(sourceEvent, eventArgs, vars.fcObj);

                        return true;
                    }
                    return false;
                },
                editConnector: function(id, key, value) {
                    var vars = this.jsVars,
                        chartApi = vars.instanceAPI,
                        reflowData = vars._reflowData || (vars._reflowData = {}),
                        hcJSON = chartApi.hcJSON,
                        connectors = hcJSON.connectors || (hcJSON.connectors = []),
                        cLn = connectors.length,
                        reflowUpdate = {
                            hcJSON: {
                                connectors: []
                            }
                        },
                        reflowConnectors = reflowUpdate.hcJSON.connectors,
                        sourceEvent = 'connectorupdated',
                        connectorJSON,
                        i,
                        j,
                        connectorGroup,
                        connector,
                        connectorLn,
                        connectorObj,
                        eventArgs,
                        config;
                    if (typeof key === OBJECTSTRING && value === undefined) {
                        config = key;
                    } else {
                        config = {};
                        config[key] = value;
                    }
                    //if it has valid x and y value and valid datasetId
                    if (id !== undefined) {
                        for (i = 0; i < cLn; i += 1) {
                            connectorGroup = connectors[i];
                            if (connectorGroup && (connector = connectorGroup.connector)) {
                                connectorLn = connector.length;
                                for (j = 0; j < connectorLn; j += 1) {
                                    if (id === connector[j].id) {
                                        connectorObj = connector[j];
                                        //don't allow change of id
                                        delete config.id;
                                        if (reflowData.hcJSON && reflowData.hcJSON.connectors &&
                                            reflowData.hcJSON.connectors[i] &&
                                            reflowData.hcJSON.connectors[i].connector &&
                                            reflowData.hcJSON.connectors[i].connector[j] &&
                                            reflowData.hcJSON.connectors[i].connector[j]._options) {
                                            config = extend2(reflowData.hcJSON.connectors[i].connector[j]._options,
                                                config, true);
                                        }
                                        config = extend2(connectorObj._options, config, true);
                                        eventArgs = {
                                            arrowAtEnd: Boolean(config.arrowatend),
                                            arrowAtStart: Boolean(config.arrowatstart),
                                            fromNodeId: config.from,
                                            id: id,
                                            label: config.label,
                                            link: config.link,
                                            sourceType: 'connector',
                                            toNodeId: config.to
                                        };

                                        reflowConnectors[i] = {
                                            connector: []
                                        };
                                        connectorJSON = connectorGroup._connectorParser(config, j);
                                        reflowConnectors[i].connector[j] = connectorJSON;
                                        extend2(reflowData, reflowUpdate, true);
                                        redrawDragNode(vars, eventArgs, sourceEvent);
                                        /**
                                         * In `DragNode` charts, connector is used to link between two
                                         * nodes. Connectors can be created, modified and removed. This
                                         * event is fired when a connector's properties are modified.
                                         *
                                         * This event is only applicable to DragNode chart.
                                         *
                                         * @event FusionCharts#connectorUpdated
                                         * @group chart-powercharts:dragnode
                                         *
                                         * @param {boolean} arrowAtEnd - True if there is an arrow at the
                                         *                  end of the link else false.
                                         * @param {boolean} arrowAtStart - True if there is an arrow at the
                                         *                  start of the link else false.
                                         * @param {number} fromNodeId - Contains the index number or the node id
                                         *                 from which the link originated.
                                         * @param {number} id - ID of the connector.
                                         * @param {string} label - Text displayed for the connector that was deleted.
                                         * @param {string} link - URL set for the connector on mouse click.
                                         * @param {number} toNodeId - Contains the index number or the node id
                                         *                 to which the link ends.
                                         *
                                         */
                                        global.raiseEvent(sourceEvent, eventArgs, vars.fcObj);
                                        return true;
                                    }
                                }
                            }
                        }
                    }
                    return false;
                },
                deleteConnector: function(id) {
                    if (id !== undefined) {
                        var vars = this.jsVars,
                            chartApi = vars.instanceAPI,
                            reflowClean = vars._reflowClean || (vars._reflowClean = {}),
                            hcJSON = chartApi.hcJSON,
                            connectors = hcJSON.connectors,
                            cleanUpdate = {
                                hcJSON: {
                                    connectors: []
                                }
                            },
                            sourceEvent = 'connectordeleted',
                            connectorObj,
                            connectorGroup,
                            connectorLn,
                            connector,
                            cLn,
                            i,
                            j,
                            eventArgs = {};
                        if (connectors && (cLn = connectors.length)) {
                            for (i = 0; i < cLn; i += 1) {
                                connectorGroup = connectors[i];
                                if (connectorGroup && (connector = connectorGroup.connector) &&
                                    (connectorLn = connector.length)) {
                                    for (j = 0; j < connectorLn; j += 1) {
                                        if (id === connector[j].id) { //id found
                                            //delete the connectors
                                            connectorObj = connector[j];
                                            eventArgs = {
                                                arrowAtEnd: connectorObj.arrowAtEnd,
                                                arrowAtStart: connectorObj.arrowAtStart,
                                                fromNodeId: connectorObj.from,
                                                id: connectorObj.id,
                                                label: connectorObj.label,
                                                link: connectorObj.connectorLink,
                                                sourceType: 'connector',
                                                toNodeId: connectorObj.to
                                            };

                                            cleanUpdate.hcJSON.connectors[i] = {
                                                connector: []
                                            };
                                            cleanUpdate.hcJSON.connectors[i].connector[j] = true;
                                            extend2(reflowClean, cleanUpdate, true);
                                            redrawDragNode(vars, eventArgs, sourceEvent);
                                            /**
                                             * In a `DragNode` chart connectors visually link two nodes. When
                                             * two nodes are linked using connectors then the connectors can be
                                             * deleted by long mouse click on the connector and by clicking on
                                             * `Delete` button.
                                             *
                                             * This event is only applicable to DragNode chart.
                                             *
                                             * @event FusionCharts#connectorDeleted
                                             * @group chart-powercharts:dragnode
                                             *
                                             * @param {boolean} arrowAtEnd - `true` if there is an arrow at the end of
                                             * the link else `false`.
                                             * @param {boolean} arrowAtStart - True if there is an arrow at the start
                                             * of the link else false.
                                             * @param {number} fromNodeId - Contains the index number or the node id
                                             *  from which the link originated.
                                             * @param {number} id - ID of the connector.
                                             * @param {string} label - Text displayed for the connector that was
                                             * deleted.
                                             * @param {string} link - URL set for the connector on mouse click.
                                             * @param {number} toNodeId - Contains the index number or the node id to
                                             * which the link ends.
                                             */
                                            global.raiseEvent(sourceEvent, eventArgs, vars.fcObj);
                                            return true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    return false;
                },
                addLabel: function(config) {
                    //if valid configuration
                    if (config) {
                        var vars = this.jsVars,
                            chartApi = vars.instanceAPI,
                            reflowData = vars._reflowData || (vars._reflowData = {}),
                            hcJSON = chartApi.hcJSON,
                            dragableLabels = hcJSON.dragableLabels || [],
                            index = dragableLabels.length,
                            reflowUpdate = {
                                hcJSON: {
                                    dragableLabels: []
                                }
                            },
                            sourceEvent = 'labeladded',
                            eventArgs;
                        reflowUpdate.hcJSON.dragableLabels[index] = config;
                        extend2(reflowData, reflowUpdate, true);

                        eventArgs = {
                            text: config.text,
                            x: config.x,
                            y: config.y,
                            allowdrag: config.allowdrag,
                            sourceType: 'labelnode',
                            link: config.link
                        };

                        redrawDragNode(vars, eventArgs, sourceEvent);
                        /**
                         * This event is fired on addding a label to a chart.
                         *
                         * This event is only applicable to DragNode chart.
                         * @event FusionCharts#labelAdded
                         * @group chart-powercharts:dragnode
                         *
                         * @param {string} text - The text in the label
                         * @param {number} x - x position of the label.
                         * @param {number} y - y position of the label.
                         *
                         */
                        global.raiseEvent(sourceEvent, eventArgs, vars.fcObj);

                        return true;
                    }
                    return false;
                },
                deleteLabel: function(index, eventArgs) {
                    var vars = this.jsVars,
                        chartApi = vars.instanceAPI,
                        reflowClean = vars._reflowClean || (vars._reflowClean = {}),
                        cleanUpdate = {
                            hcJSON: {
                                dragableLabels: []
                            }
                        },
                        hcJSON = chartApi.hcJSON,
                        dragableLabels = hcJSON.dragableLabels || [],
                        length = dragableLabels.length,
                        sourceEvent = 'labeldeleted';
                    //if valid index
                    if (index < length) {
                        //delet the label
                        cleanUpdate.hcJSON.dragableLabels[index] = true;
                        extend2(reflowClean, cleanUpdate, true);
                        redrawDragNode(vars, eventArgs, sourceEvent);
                        /**
                         * This event is fired on deleting a label of a chart.
                         *
                         * This event is only applicable to DragNode chart.
                         *
                         * @event FusionCharts#labelDeleted
                         * @group chart-powercharts:dragnode
                         *
                         * @param {string} text - The text in the label
                         * @param {number} x - x position of the label.
                         * @param {number} y - y position of the label.
                         *
                         */
                        global.raiseEvent(sourceEvent, eventArgs, vars.fcObj);

                        return true; //success
                    }
                    return false; //not valid
                },
                setThreshold: function(thresold) {
                    var vars = this.jsVars,
                        HCChart = vars.hcObj,
                        connectorsStore = HCChart.connectorsStore || [],
                        ln = connectorsStore.length,
                        connector,
                        i;

                    for (i = 0; i < ln; i += 1) {
                        connector = connectorsStore[i];
                        if (connector && connector.options) {
                            if (connector.options.conStrength < thresold) {
                                connector.graphic && connector.graphic.hide();
                                if (connector.text) {
                                    connector.text.hide();
                                    connector.text.textBoundWrapper &&
                                        connector.text.textBoundWrapper.hide();
                                }
                            } else {
                                connector.graphic && connector.graphic.show();
                                if (connector.text) {
                                    connector.text.show();
                                    connector.text.textBoundWrapper &&
                                        connector.text.textBoundWrapper.show();
                                }
                            }
                        }
                    }

                }


            }),

            getCollatedData: function() {
                var api = this,
                    fcObj = api.chartInstance,
                    state = fcObj.__state,
                    vars = fcObj.jsVars,
                    origChartData = api.updatedDataObj ||
                        extend2({}, fcObj.getChartData(global.dataFormats.JSON)),
                    reflowData = vars._reflowData,
                    reflowClean = vars._reflowClean,
                    origLabel = (origChartData.labels || (origChartData.labels = {
                        label: []
                    })) && (origChartData.labels.label ||
                        (origChartData.labels.label = [])),
                    updatedLabels = (reflowData && reflowData.hcJSON &&
                        reflowData.hcJSON.dragableLabels),
                    cleanedLabels = (reflowClean && reflowClean.hcJSON &&
                        reflowClean.hcJSON.dragableLabels),
                    origConnectors = origChartData.connectors,
                    updatedConnectors = (reflowData && reflowData.hcJSON &&
                        reflowData.hcJSON.connectors),
                    cleanedConnectors = (reflowClean && reflowClean.hcJSON &&
                        reflowClean.hcJSON.connectors),
                    origDataSets = origChartData.dataset,
                    updatedData = (reflowData && reflowData.hcJSON &&
                        reflowData.hcJSON.series),
                    cleanedData = (reflowClean && reflowClean.hcJSON &&
                        reflowClean.hcJSON.series),
                    i = (updatedData && updatedData.length),
                    j,
                    origSet,
                    updatedSet,
                    dataItem,
                    origConnector,
                    updatedConnector,
                    connectorItem;

                if (state.hasStaleData !== undefined && !state.hasStaleData &&
                    api.updatedDataObj) {
                    return api.updatedDataObj;
                }
                // Update data
                if (origDataSets && updatedData) {
                    while (i--) {
                        origSet = (origDataSets[i] && origDataSets[i].data);
                        updatedSet = (updatedData[i] && updatedData[i].data);
                        j = (updatedSet && updatedSet.length);

                        if (j && origSet) {
                            while (j--) {
                                dataItem = updatedSet[j];
                                if (dataItem) {
                                    if (origSet[j]) {
                                        extend2(origSet[j], dataItem._options);
                                    } else {
                                        origSet[j] = dataItem._options;
                                    }
                                }
                            }
                        }
                    }
                }
                // Update connectors
                i = (updatedConnectors && updatedConnectors.length);
                if (i) {
                    if (!origChartData.connectors) {
                        origConnectors = origChartData.connectors = [{
                            connector: []
                        }];
                    }
                    while (i--) {
                        origConnector = (origConnectors[i] &&
                            origConnectors[i].connector);
                        updatedConnector = (updatedConnectors[i] &&
                            updatedConnectors[i].connector);
                        j = (updatedConnector && updatedConnector.length);

                        if (j && origConnector) {
                            while (j--) {
                                connectorItem = updatedConnector[j];
                                if (connectorItem) {
                                    if (origConnector[j]) {
                                        extend2(origConnector[j],
                                            connectorItem._options);
                                    } else {
                                        origConnector[j] = connectorItem._options;
                                    }
                                }
                            }
                        }
                    }
                }
                // Update labels
                // If any label added
                i = (updatedLabels && updatedLabels.length);
                if (i && updatedLabels) {
                    while (i--) {
                        if (updatedLabels[i]) {
                            origLabel[i] = updatedLabels[i];
                        }
                    }
                }

                //update all deleted data
                deltend(origDataSets, cleanedData);
                deltend(origConnectors, cleanedConnectors);
                deltend(origLabel, cleanedLabels);

                state.hasStaleData = false;
                return (api.updatedDataObj = origChartData);
            },

            createHtmlDialog: function(chart, dialogWidth, dialogHeight,
                onsubmit, oncancel, onremove) {
                var iapi = this,
                    paper = chart.paper,
                    conf = iapi.hcJSON[CONFIGKEY],
                    inCanvasStyle = conf.inCanvasStyle,
                    chartWidth = chart.chartWidth,
                    chartHeight = chart.chartHeight,
                    padding = 5,
                    buttonStyle = {
                        color: inCanvasStyle.color,
                        textAlign: 'center',
                        paddingTop: 1 + PX,
                        border: '1px solid #cccccc',
                        borderRadius: 4 + PX,
                        cursor: 'pointer',
                        '_cursor': 'hand',
                        backgroundColor: '#ffffff',
                        zIndex: 21,
                        '-webkit-border-radius': 4 + PX
                    },
                    ui;
                ui = paper.html('div', {
                    fill: 'transparent',
                    width: chartWidth,
                    height: chartHeight
                }, {
                    fontSize: 10 + PX,
                    lineHeight: 15 + PX,
                    fontFamily: inCanvasStyle.fontFamily
                }, chart.container);

                ui.veil = paper.html('div', {
                    fill: '000000',
                    width: chartWidth,
                    height: chartHeight,
                    opacity: 0.3
                }, undefined, ui);

                ui.dialog = paper.html('div', {
                    x: (chartWidth - dialogWidth) / 2,
                    y: (chartHeight - dialogHeight) / 2,
                    fill: 'efefef',
                    strokeWidth: 1,
                    stroke: '000000',
                    width: dialogWidth,
                    height: dialogHeight
                }, {
                    borderRadius: 5 + PX,
                    boxShadow: '1px 1px 3px #000000',
                    '-webkit-border-radius': 5 + PX,
                    '-webkit-box-shadow': '1px 1px 3px #000000',
                    filter: 'progid:DXImageTransform.Microsoft.Shadow(Strength=4, Direction=135, Color="#000000")'
                }, ui);

                ui.ok = paper.html('div', {
                    x: dialogWidth - 70 - padding,
                    y: dialogHeight - 23 - padding,
                    width: 65,
                    height: 17,
                    text: 'Submit',
                    tabIndex: 1
                }, buttonStyle, ui.dialog)
                    .on('click', onsubmit);

                ui.cancel = paper.html('div', {
                    x: dialogWidth - 140 - padding,
                    y: dialogHeight - 23 - padding,
                    width: 65,
                    height: 17,
                    text: 'Cancel',
                    tabIndex: 2
                }, buttonStyle, ui.dialog).on('click', oncancel);

                ui.remove = paper.html('div', {
                    x: dialogWidth - 210 - padding,
                    y: dialogHeight - 23 - padding,
                    width: 65,
                    height: 17,
                    text: 'Delete',
                    tabIndex: 3,
                    visibility: 'hidden'
                }, buttonStyle, ui.dialog).on('click', onremove);

                // Add an event that would handle enter and esc on input
                // elements
                ui.handleKeyPress = function(e) {
                    if (e.keyCode === 13) {
                        ui.ok.trigger(hasTouch ? 'touchStart' : 'click', e);
                    } else if (e.keyCode === 27) {
                        ui.cancel.trigger(hasTouch ? 'touchStart' : 'click', e);
                    }
                };

                // Keep initially hidden.
                ui.hide();

                return ui;
            },

            nodeUpdateUIDefinition: [{
                key: 'id',
                text: 'Id',
                inputWidth: 60,
                x: 10,
                y: 15
            }, {
                key: 'dataset',
                text: 'Dataset',
                inputType: 'select',
                inputWidth: 110,
                innerHTML: undefined,
                x: 170,
                y: 15
            }, {
                key: 'x',
                text: 'Value',
                x: 10,
                y: 40,
                inputWidth: 21
            }, {
                key: 'y',
                text: ',',
                x: 88,
                y: 40,
                inputWidth: 21,
                labelWidth: 5
            }, {
                text: '(x, y)',
                x: 125,
                y: 40,
                labelWidth: 33,
                noInput: true
            }, {
                key: 'tooltip',
                text: 'Tooltip',
                inputWidth: 105,
                x: 170,
                y: 40
            }, {
                key: 'label',
                text: 'Label',
                inputWidth: 92,
                x: 10,
                y: 65
            }, {
                key: 'labelalign',
                text: 'Align',
                labelWidth: 70,
                inputWidth: 110,
                inputType: 'select',
                innerHTML: '<option></option><option value="top">Top</option><option value="middle">Middle</option>' +
                    '<option value="bottom">Bottom</option>',
                x: 145,
                y: 63
            }, {
                key: 'color',
                text: 'Color',
                x: 10,
                y: 90,
                inputWidth: 60
            }, {
                key: 'colorOut',
                innerHTML: '&nbsp;',
                x: 85,
                y: 90,
                inputWidth: 15,
                inputType: 'span'
            }, {
                key: 'alpha',
                text: 'Alpha',
                x: 170,
                y: 90,
                inputWidth: 20
            }, {
                key: 'draggable',
                text: 'Allow Drag',
                value: true,
                inputWidth: 20,
                x: 250,
                y: 90,
                labelWidth: 58,
                inputPaddingTop: 3,
                type: 'checkbox'
            }, {
                key: 'shape',
                text: 'Shape',
                inputType: 'select',
                inputWidth: 97,
                innerHTML: '<option value="rect">Rectangle</option><option value="circ">Circle</option><option ' +
                    'value="poly">Polygon</option>',
                x: 10,
                y: 115
            }, {
                key: 'rectHeight',
                text: 'Height',
                x: 170,
                y: 115,
                inputWidth: 20
            }, {
                key: 'rectWidth',
                text: 'Width',
                x: 255,
                y: 115,
                inputWidth: 20
            }, {
                key: 'circPolyRadius',
                text: 'Radius',
                x: 170,
                y: 115,
                inputWidth: 20
            }, {
                key: 'polySides',
                text: 'Sides',
                x: 255,
                y: 115,
                inputWidth: 20
            }, {
                key: 'link',
                text: 'Link',
                x: 10,
                y: 140,
                inputWidth: 92
            }, {
                key: 'image',
                text: 'Image',
                type: 'checkbox',
                inputPaddingTop: 4,
                inputWidth: 20,
                x: 10,
                y: 170
            }, {
                key: 'imgUrl',
                text: 'URL',
                inputWidth: 105,
                x: 170,
                y: 170
            }, {
                key: 'imgWidth',
                text: 'Width',
                inputWidth: 20,
                x: 10,
                y: 195
            }, {
                key: 'imgHeight',
                text: 'Height',
                inputWidth: 20,
                x: 82,
                y: 195
            }, {
                key: 'imgAlign',
                text: 'Align',
                inputType: 'select',
                inputWidth: 75,
                innerHTML: '<option value="top">Top</option><option value="middle">Middle</option><option ' +
                    'value="bottom">Bottom</option>',
                x: 170,
                y: 195
            }],


            showNodeUpdateUI: (function() {
                var manageShapeFields = function(chart) {
                    var ui = chart.cacheUpdateUI,
                        fields = ui.fields,
                        ele = fields.shape,
                        shapeFields = ['rectWidth', 'rectHeight', 'circPolyRadius',
                            'polySides'
                        ],
                        i = shapeFields.length,
                        key;

                    while (i--) {
                        key = shapeFields[i];
                        if (/rect|poly|circ/ig.test(key)) {
                            ui.labels[key].hide();
                            ui.fields[key].hide();
                        }
                        if (new RegExp(pluck(ele.val(), 'rect'), 'ig').test(key)) {
                            ui.labels[key].show();
                            ui.fields[key].show();
                        }
                    }
                },
                    showGivenColor = function(chart) {
                        var ui = chart.cacheUpdateUI,
                            fields = ui.fields,
                            color = getValidColor(fields.color.val());

                        color && fields.colorOut.css({
                            background: parseColor(color)
                        });
                    },
                    manageImageFields = function(chart, animate) {
                        var ui = chart.cacheUpdateUI,
                            fields = ui.fields,
                            ele = fields.image,
                            chartHeight = chart.chartHeight,
                            padding = 5,
                            isChecked = ele.val(),
                            animation = animate ? 300 : 0,
                            imgKey = ['imgWidth', 'imgHeight', 'imgAlign', 'imgUrl'],
                            dialogHeight,
                            i,
                            key;

                        dialogHeight = isChecked ? 250 : 215;

                        ui.ok.hide();
                        ui.cancel.hide();
                        ui.remove.hide();
                        ui.error.hide();
                        i = imgKey.length;
                        while (!isChecked && i--) {
                            key = imgKey[i];
                            ui.labels[key].hide();
                            ui.fields[key].hide();
                        }

                        lib.danimate.animate(ui.dialog.element, {
                            top: (chartHeight - dialogHeight) / 2,
                            height: dialogHeight
                        }, animation, 'linear', function() {
                            i = imgKey.length;
                            while (i-- && isChecked) {
                                key = imgKey[i];
                                ui.labels[key].show();
                                ui.fields[key].show();
                            }
                            ui.ok.attr({
                                y: dialogHeight - 23 - padding
                            }).show();
                            ui.cancel.attr({
                                y: dialogHeight - 23 - padding
                            }).show();
                            ui.remove.attr({
                                y: dialogHeight - 23 - padding
                            });
                            ui.error.attr({
                                y: dialogHeight - 23 - padding + 4
                            }).show();
                            if (ui.edit) {
                                ui.remove.show();
                            } else {
                                ui.remove.hide();
                            }
                        });

                    };

                return function(chart, config, edit) {
                    var iapi = this,
                        ui = chart.cacheUpdateUI,
                        conf = iapi.hcJSON[CONFIGKEY],
                        inCanvasStyle = conf.inCanvasStyle,
                        paper = chart.paper,
                        borderStyle = '1px solid #cccccc',
                        inputStyle = {
                            width: 80 + PX,
                            border: borderStyle,
                            fontSize: 10 + PX,
                            lineHeight: 15 + PX,
                            padding: 2 + PX,
                            fontFamily: inCanvasStyle.fontFamily
                        },
                        i = 0,
                        labelStyle = {
                            textAlign: 'right'
                        },
                        fields = ui && ui.fields,
                        labels = ui && ui.labels,
                        dialog;

                    if (!ui) {
                        ui = chart.cacheUpdateUI = iapi.createHtmlDialog(chart,
                            350, 215,
                            //submit function
                            function() {
                                var fields = ui && ui.fields,
                                    edit = ui.edit,
                                    chartInstance = iapi.chartInstance,
                                    hcJSON = iapi.hcJSON,
                                    xMin,
                                    yMin,
                                    series,
                                    sLn,
                                    idFound,
                                    j,
                                    id,
                                    data,
                                    dataLn,
                                    submitObj,
                                    shapeType;

                                if (!hcJSON) {
                                    return false;
                                }

                                xMin = hcJSON.xAxis.min;
                                yMin = hcJSON.yAxis[0].min;
                                series = hcJSON.series;
                                sLn = series.length;

                                if (fields) {
                                    switch (fields.shape.val()) {
                                    case 'circ':
                                        shapeType = 'circle';
                                        break;
                                    case 'poly':
                                        shapeType = 'polygon';
                                        break;
                                    default:
                                        shapeType = 'rectangle';
                                        break;
                                    }

                                    submitObj = {
                                        x: getFirstValue(fields.x.val(), xMin),
                                        y: getFirstValue(fields.y.val(), yMin),
                                        id: id = fields.id.val(),
                                        datasetId: fields.dataset.val(),
                                        name: fields.label.val(),
                                        tooltext: fields.tooltip.val(),
                                        color: fields.color.val(),
                                        alpha: fields.alpha.val(),
                                        labelalign: fields.labelalign.val(),
                                        allowdrag: fields.draggable.val(),
                                        shape: shapeType,
                                        width: fields.rectWidth.val(),
                                        height: fields.rectHeight.val(),
                                        radius: fields.circPolyRadius.val(),
                                        numsides: fields.polySides.val(),
                                        imagenode: fields.image.val(),
                                        imagewidth: fields.imgWidth.val(),
                                        imageheight: fields.imgHeight.val(),
                                        imagealign: fields.imgAlign.val(),
                                        imageurl: fields.imgUrl.val(),
                                        link: fields.link.val()
                                    };

                                    // Validating ID already exist or not
                                    if (id !== undefined && !edit) {
                                        for (i = 0; i < sLn && !idFound; i += 1) {
                                            data = series[i].data;
                                            dataLn = data.length;
                                            for (j = 0; j < dataLn; j += 1) {
                                                if (id === data[j].id) {
                                                    idFound = true;
                                                }
                                            }
                                        }
                                    }

                                    if (!idFound) {
                                        edit ? (chartInstance && chartInstance.setNodeAttribute &&
                                            chartInstance.setNodeAttribute(submitObj.id, submitObj)) : (chartInstance &&
                                            chartInstance.addNode && chartInstance.addNode(submitObj));
                                        return;
                                    } else {
                                        ui.error.attr({
                                            text: 'ID already exist.'
                                        });
                                        fields.label.focus();
                                    }
                                }
                                // Remobe disabled from attr
                                ui.enableFields();
                            },
                            // Cancel function
                            function() {
                                // Hide the UI
                                ui.hide();
                                // Remobe disabled from attr
                                ui.enableFields();
                                // Hide error msg
                                ui.error.attr({
                                    text: BLANK
                                });
                            },
                            // Delete function
                            function() {
                                iapi.chartInstance.deleteNode &&
                                    iapi.chartInstance.deleteNode(ui.fields.id.val());
                            });
                        // add fields.
                        dialog = ui.dialog;
                        labels = ui.labels = {};
                        fields = ui.fields = {};
                    }
                    ui.config = config;
                    ui.edit = edit;
                    if (!ui.error) {
                        ui.error = paper.html('span', {
                            color: 'ff0000',
                            x: 30,
                            y: 228
                        }, undefined, dialog);
                    }
                    if (!ui.enableFields) {
                        ui.enableFields = function() {
                            var key;
                            for (key in config) {
                                if (config[key] && config[key].disabled && fields[key]) {
                                    fields[key].element.removeAttribute('disabled');
                                }
                            }
                        };
                    }

                    each(this.nodeUpdateUIDefinition, function(def) {
                        var field,
                            key = def.key,
                            attrs = {},
                            confObj = config[key] || {},
                            innerHTML,
                            value;

                        !labels[key] && (labels[key] = paper.html('label', {
                            x: def.x,
                            y: def.y,
                            width: def.labelWidth || 45,
                            text: def.text
                        }, labelStyle, dialog));


                        // No need to proceed of this label has no input box
                        // associated with itself.
                        if (def.noInput) {
                            return;
                        }

                        field = fields[key];

                        if (!field) {
                            inputStyle.border = def.type == 'checkbox' ? BLANK : borderStyle;
                            field = fields[key] =
                                paper.html(def.inputType || 'input', {
                                    x: def.labelWidth && (def.labelWidth + 5) || 50,
                                    y: -2 + (def.inputPaddingTop || 0),
                                    width: def.inputWidth || 50
                                }, inputStyle);

                            if (def.inputType !== 'select') {
                                field.attr({
                                    type: def.type || 'text'
                                }).on('keyup', ui.handleKeyPress);
                            }
                            field.add(labels[key]);
                        }


                        if (defined(innerHTML = getFirstValue(confObj.innerHTML, def.innerHTML))) {
                            attrs.innerHTML = innerHTML;
                        }
                        if (confObj.disabled) {
                            attrs.disabled = 'disabled';
                        }
                        field.attr(attrs);
                        if (defined(value = getFirstValue(confObj.value, def.value))) {
                            field.val(value);
                        }

                        key == 'shape' && field.on('change', function() {
                            manageShapeFields(chart);
                        });
                        key == 'image' && field.on('click', function() {
                            manageImageFields(chart, true);
                        });
                        key == 'color' && field.on('keyup', function() {
                            showGivenColor(chart);
                        });
                    });

                    showGivenColor(chart);
                    manageImageFields(chart);
                    manageShapeFields(chart);
                    if (chart.options.chart.animation) {
                        ui.fadeIn('fast');
                    } else {
                        ui.show();
                    }
                    ui.fields[edit ? 'label' : 'id'].focus();
                };
            })(),

            labelUpdateUIDefinition: [{
                key: 'label',
                text: 'Label*',
                x: 10,
                y: 15,
                inputWidth: 235
            }, {
                key: 'size',
                text: 'Size',
                x: 10,
                y: 40
            }, {
                key: 'padding',
                text: 'Padding',
                x: 10,
                y: 65
            }, {
                key: 'x',
                text: 'Position',
                x: 120,
                y: 65,
                labelWidth: 70,
                inputWidth: 25
            }, {
                key: 'y',
                text: ',',
                x: 225,
                y: 65,
                labelWidth: 10,
                inputWidth: 25
            }, {
                key: 'xy',
                text: '(x, y)',
                x: 260,
                y: 65,
                noInput: true
            }, {
                key: 'allowdrag',
                text: 'Allow Drag',
                x: 120,
                y: 40,
                inputType: 'checkbox',
                inputPaddingTop: 3,
                inputWidth: 15,
                labelWidth: 70,
                val: 1
            }, {
                key: 'color',
                text: 'Color',
                x: 10,
                y: 90
            }, {
                key: 'alpha',
                text: 'Alpha',
                x: 145,
                y: 90,
                inputWidth: 30,
                val: '100'
            }, {
                key: 'bordercolor',
                text: 'Border Color',
                x: 10,
                y: 125,
                labelWidth: 100
            }, {
                key: 'bgcolor',
                text: 'Background Color',
                x: 10,
                y: 150,
                labelWidth: 100
            }],

            showLabelUpdateUI: function(chart, options) {
                var iapi = this,
                    paper = chart.paper,
                    conf = iapi.hcJSON[CONFIGKEY],
                    inCanvasStyle = conf.inCanvasStyle,
                    ui = chart.cacheLabelUpdateUI,
                    inputStyle = {
                        border: '1px solid #cccccc',
                        fontSize: 10 + PX,
                        lineHeight: 15 + PX,
                        fontFamily: inCanvasStyle.fontFamily,
                        padding: 2 + PX
                    },
                    labelStyle = {
                        textAlign: 'right'
                    },
                    fields = ui && ui.fields,
                    labels = ui && ui.labels,
                    field,
                    value,
                    dialog;

                if (!ui) {
                    ui = chart.cacheLabelUpdateUI = iapi.createHtmlDialog(chart,
                        315, 205, function() {
                            var fields = ui && ui.fields,
                                submitObj;
                            if (fields) {
                                // Prepare obbject for submission.
                                submitObj = {
                                    text: fields.label.val(),
                                    x: fields.x.val(),
                                    y: fields.y.val(),
                                    color: fields.color.val(),
                                    alpha: fields.alpha.val(),
                                    bgcolor: fields.bgcolor.val(),
                                    bordercolor: fields.bordercolor.val(),
                                    fontsize: fields.size.val(),
                                    allowdrag: fields.allowdrag.val(),
                                    padding: fields.padding.val()
                                };

                                if (submitObj.text) {
                                    iapi.chartInstance && iapi.chartInstance.addLabel &&
                                        iapi.chartInstance.addLabel(submitObj);
                                    return;
                                } else {
                                    ui.error.attr({
                                        text: 'Label cannot be blank.'
                                    });
                                    fields.label.focus();

                                }
                            }
                        }, function() {
                            ui.error.attr({
                                text: ''
                            });
                            ui.hide();
                        });
                    dialog = ui.dialog;
                    labels = ui.labels = {};
                    fields = ui.fields = {};
                }

                each(iapi.labelUpdateUIDefinition, function(def) {
                    var key = def.key;

                    if (!labels[key]) {
                        labels[key] = paper.html(LABEL, {
                            x: def.x,
                            y: def.y,
                            width: def.labelWidth || 45,
                            text: def.text
                        }, labelStyle, dialog);
                    }

                    // No need to proceed of this label has no input box
                    // associated with itself.
                    if (def.noInput) {
                        return;
                    }

                    if (!(field = fields[key])) {
                        field = fields[key] = paper.html(INPUT, {
                            y: -2 + (def.inputPaddingTop || 0),
                            x: def.labelWidth && (def.labelWidth + 5) || 50,
                            width: def.inputWidth || 50,
                            type: def.inputType || 'text'
                        }, inputStyle, labels[key]).on('keyup', ui.handleKeyPress);
                    }

                    if ((value = pluck(options[key], def.val)) !== undefined) {
                        field.val(value);
                    }

                });

                if (!ui.error) {
                    ui.error = paper.html('span', {
                        color: 'ff0000',
                        x: 10,
                        y: 180
                    }, undefined, dialog);
                }

                // Show the dialog box
                if (chart.animation) {
                    ui.fadeIn('fast');
                } else {
                    ui.show();
                }
                // Focus on label textbox
                ui.fields.label.focus();
            },

            showLabelDeleteUI: function(chart, label) {
                var iapi = this,
                    paper = chart.paper,
                    ui = chart['cache-label-delete-ui'],
                    labelNode = label.data && label.data('data') || {},
                    eventArgs = label.data && label.data('eventArgs');

                labelNode = labelNode && labelNode.labelNode;
                if (!ui) {
                    ui = chart['cache-label-delete-ui'] =
                        iapi.createHtmlDialog(chart, 250, 100, undefined, function() {
                                ui.hide();
                            },
                            function() {
                                iapi.chartInstance.deleteLabel(labelNode.index, eventArgs);
                            });

                    // create a location where to show the text message
                    ui.message = paper.html('span', {
                        x: 10,
                        y: 10,
                        width: 230,
                        height: 80
                    }).add(ui.dialog);
                    // since submit button is not needed, hide it and move the
                    // delete button to its place.
                    ui.ok.hide();
                    ui.remove.translate(175).show();
                }

                // Update the message with proper text.
                ui.message.attr({
                    text: 'Would you really like to delete the label: \"' +
                        labelNode.text + '\"?'
                });

                // Show the dialog box
                if (chart.animation) {
                    ui.fadeIn('fast');
                } else {
                    ui.show();
                }
            },

            connectorUpdateUIDefinition: [{
                key: 'fromid',
                text: 'Connect From',
                inputType: 'select',
                x: 10,
                y: 15,
                labelWidth: 80,
                inputWidth: 100
            }, {
                key: 'toid',
                text: 'Connect To',
                inputType: 'select',
                x: 10,
                y: 40,
                labelWidth: 80,
                inputWidth: 100
            }, {
                key: 'arratstart',
                text: 'Arrow At Start',
                x: 200,
                y: 15,
                type: 'checkbox',
                inputPaddingTop: 3,
                labelWidth: 80,
                inputWidth: 15
            }, {
                key: 'arratend',
                text: 'Arrow At End',
                x: 200,
                y: 40,
                type: 'checkbox',
                inputPaddingTop: 3,
                labelWidth: 80,
                inputWidth: 15
            }, {
                key: 'label',
                text: 'Label',
                x: 10,
                y: 75,
                labelWidth: 40,
                inputWidth: 120
            }, {
                key: 'id',
                text: 'Node ID',
                x: 190,
                y: 75,
                inputWidth: 55
            }, {
                key: 'color',
                text: 'Color',
                x: 10,
                y: 100,
                labelWidth: 40,
                inputWidth: 35
            }, {
                key: 'alpha',
                text: 'Alpha',
                x: 110,
                y: 100,
                inputWidth: 25,
                labelWidth: 35
            }, {
                key: 'strength',
                text: 'Strength',
                x: 190,
                y: 100,
                inputWidth: 55,
                val: '0.1'
            }, {
                key: 'url',
                text: 'Link',
                x: 10,
                y: 125,
                labelWidth: 40,
                inputWidth: 120
            }, {
                key: 'tooltext',
                text: 'Tooltip',
                x: 190,
                y: 125,
                labelWidth: 40,
                inputWidth: 60
            }, {
                key: 'dashed',
                text: 'Dashed',
                x: 10,
                y: 150,
                type: 'checkbox',
                inputPaddingTop: 3,
                inputWidth: 15,
                labelWidth: 40
            }, {
                key: 'dashgap',
                text: 'Dash Gap',
                x: 85,
                y: 150,
                labelWidth: 60,
                inputWidth: 25
            }, {
                key: 'dashlen',
                text: 'Dash Length',
                x: 190,
                y: 150,
                labelWidth: 70,
                inputWidth: 30
            }],

            showConnectorUpdateUI: function(chart, config, edit) {
                var iapi = this,
                    chartInstance = iapi.chartInstance,
                    renderer = chart.paper,
                    conf = iapi.hcJSON[CONFIGKEY],
                    inCanvasStyle = conf.inCanvasStyle,
                    ui = chart.cacheConnectorUpdateUI,
                    inputStyle = {
                        border: '1px solid #cccccc',
                        fontSize: 10 + PX,
                        lineHeight: 15 + PX,
                        fontFamily: inCanvasStyle.fontFamily,
                        padding: 2 + PX
                    },
                    labelStyle = {
                        textAlign: 'right'
                    },
                    fields = ui && ui.fields,
                    labels = ui && ui.labels,
                    innerHTML,
                    field,
                    value,
                    dialog;

                if (!ui) {
                    ui = chart.cacheConnectorUpdateUI = iapi.createHtmlDialog(chart,
                        315, 215,
                        function() {
                            var fields = ui && ui.fields,
                                submitObj;
                            if (fields) {
                                submitObj = {
                                    from: fields.fromid.val(),
                                    to: fields.toid.val(),
                                    id: fields.id.val(),
                                    label: fields.label.val(),
                                    color: fields.color.val(),
                                    alpha: fields.alpha.val(),
                                    link: fields.url.val(),
                                    tooltext: fields.tooltext.val(),
                                    strength: fields.strength.val(),
                                    arrowatstart: fields.arratstart.val(),
                                    arrowatend: fields.arratend.val(),
                                    dashed: fields.dashed.val(),
                                    dashlen: fields.dashlen.val(),
                                    dashgap: fields.dashgap.val()
                                };

                                // Validate
                                if (submitObj.from) {
                                    if (submitObj.to) {
                                        if (submitObj.from != submitObj.to) {
                                            edit ? chartInstance.editConnector(submitObj.id, submitObj) :
                                                chartInstance.addConnector(submitObj);
                                            ui.enableFields();
                                            return;
                                        } else {
                                            ui.error.attr({
                                                text: 'Connector cannot start and end at the same node!'
                                            });
                                            fields.fromid.focus();
                                        }
                                    } else {
                                        ui.error.attr({
                                            text: 'Please select a valid connector end.'
                                        });
                                        fields.toid.focus();
                                    }
                                } else {
                                    ui.error.attr({
                                        text: 'Please select a valid connector start.'
                                    });
                                    fields.fromid.focus();
                                }
                            }
                        },
                        // Cancel function
                        function() {
                            ui.error.attr({
                                text: ''
                            });
                            ui.enableFields();
                            ui.hide();
                        },
                        // Delete function
                        function() {
                            chartInstance.deleteConnector(ui.fields.id.val());
                        });
                    dialog = ui.dialog;
                    labels = ui.labels = {};
                    fields = ui.fields = {};
                }

                ui.config = config;
                ui.enableFields = function() {
                    var key;
                    for (key in config) {
                        if (config[key] && config[key].disabled && fields[key]) {
                            fields[key].element.removeAttribute('disabled');
                        }
                    }
                };



                each(iapi.connectorUpdateUIDefinition, function(def) {
                    var key = def.key,
                        attr = config[key] || {};

                    if (!labels[key]) {
                        labels[key] = renderer.html(LABEL, {
                            x: def.x,
                            y: def.y,
                            width: def.labelWidth || 45,
                            text: def.text
                        }, labelStyle, dialog);
                    }

                    // No need to proceed of this label has no input box
                    // associated with itself.
                    if (def.noInput) {
                        return;
                    }

                    if (!(field = fields[key])) {
                        field = fields[key] = renderer.html(def.inputType || INPUT, {
                            y: -2 + (def.inputPaddingTop || 0),
                            x: def.labelWidth && (def.labelWidth + 5) || 50,
                            width: def.inputWidth || 50
                        }, inputStyle);

                        if (def.inputType !== 'select') {
                            field.attr({
                                type: def.type || 'text'
                            }).on('keyup', ui.handleKeyPress);
                        }
                        field.add(labels[key]);
                    }

                    if ((innerHTML = pluck(attr.innerHTML, def.innerHTML))) {
                        field.attr({
                            innerHTML: innerHTML
                        });
                    }
                    if ((value = pluck(attr.val, def.val)) !== undefined) {
                        field.val(value);
                    }
                    if (attr.disabled) {
                        field.attr({
                            disabled: 'disabled'
                        });
                    }
                });

                //dash checking and ui modification
                //call to set default fro the first time
                ui.checkDash = function() {
                    var checked = fields.dashed && fields.dashed.val(),
                        showHideFn = checked ? 'show' : 'hide';
                    labels.dashgap && labels.dashgap[showHideFn]();
                    fields.dashgap && fields.dashgap[showHideFn]();
                    labels.dashlen && labels.dashlen[showHideFn]();
                    fields.dashlen && fields.dashlen[showHideFn]();
                };
                ui.checkDash();
                fields.dashed.on('click', ui.checkDash);

                if (!ui.error) {
                    ui.error = renderer.html('span', {
                        color: 'ff0000',
                        x: 10,
                        y: 170
                    }, undefined, dialog);
                }


                ui.remove[edit ? 'show' : 'hide']();
                // Show the dialog box
                if (chart.animation) {
                    ui.fadeIn('fast');
                } else {
                    ui.show();
                }
            },

            drawNodeUpdateButtons: function() {
                var chart = this,
                    logic = chart.logic,
                    options = chart.options,
                    chartOptions = options.chart,
                    pointStore = options.pointStore || {},
                    seriesArr = options.series,
                    conf = options[CONFIGKEY],
                    outCanvasStyle = conf && conf.outCanvasStyle || chart.outCanvasStyle || {},
                    menu = chart.menu || (chart.menu = []),
                    toolbar = chart.toolbar,
                    len = seriesArr.length,
                    str1 = '<option value="',
                    str2 = '">',
                    str3 = '</option>',
                    pointOptionsStr = '',
                    seriesOptionsStr = '',
                    seriesObj,
                    nodeUpdateMenu,
                    i;

                for (i in pointStore) {
                    pointOptionsStr += str1 + i + str2 + i + str3;
                }

                for (i = 0; i < len; i += 1) {
                    seriesObj = seriesArr[i];
                    //options = seriesObj && seriesObj.options;
                    seriesOptionsStr += str1 + seriesObj.id + str2 + ((seriesObj.name !== BLANK && seriesObj.name !==
                        UNDEFINED) && seriesObj.name + COMMASTRING + BLANKSPACE || BLANK) + seriesObj.id + str3;
                }

                menu.push(nodeUpdateMenu = createContextMenu({
                    chart: chart,
                    basicStyle: outCanvasStyle,
                    items: [{
                        text: 'Add a Node',
                        onclick: function() {
                            logic.showNodeUpdateUI(chart, {
                                dataset: {
                                    innerHTML: seriesOptionsStr
                                }
                            });
                        }
                    }, {
                        text: 'Add a Label',
                        onclick: function() {
                            logic.showLabelUpdateUI(chart, {});
                        }
                    }, {
                        text: 'Add a Connector',
                        onclick: function() {
                            //add a selection method for start and end
                            logic.showConnectorUpdateUI(chart, {
                                fromid: {
                                    innerHTML: pointOptionsStr
                                },
                                toid: {
                                    innerHTML: pointOptionsStr
                                }
                            });
                        }
                    }],
                    position: {
                        x: chartOptions.spacingLeft,
                        y: chart.chartHeight - chartOptions.spacingBottom +
                            (!chartOptions.showFormBtn && !chartOptions.showRestoreBtn ? -15 : 10)
                    }
                }));

                /** @todo  When the addButton function is ready we need to use it
               instead of paper.button drawing; */
                chart.elements.configureButton = toolbar.add('configureIcon', (function(x, y) {
                    return function() {
                        if (nodeUpdateMenu.visible) {
                            nodeUpdateMenu.hide();
                            return;
                        }
                        nodeUpdateMenu.show({
                            x: x,
                            y: y + 1
                        });
                    };
                }()), {
                    x: chartOptions.spacingLeft,
                    y: chart.chartHeight - chartOptions.spacingBottom +
                        (!chartOptions.showFormBtn && !chartOptions.showRestoreBtn ? -15 : 10),
                    tooltip: 'Add or edit items'
                });
            },

            postSeriesAddition: function() {
                var api = this,
                    fc = api.dataObj,
                    hc = api.hcJSON,
                    chartAttr = fc.chart,
                    result = api.base.postSeriesAddition &&
                        api.base.postSeriesAddition.apply(api, arguments);

                // Hide legend by default
                hc.legend.enabled = (chartAttr.showlegend == ONE) ?
                    true : false;

                // Draw button to control manipulation of nodes, labels and
                // connectors.
                if (!(hc.chart.viewMode = pluckNumber(chartAttr.viewmode, 0))) {
                    (hc.callbacks ||
                        (hc.callbacks = [])).push(api.drawNodeUpdateButtons);
                }

                return result;
            },

            pointHoverOptions: function(dataObj, dataset, fcChartObj, defaults) {
                var hoverEffect = pluckNumber(dataObj.showhovereffect, dataset.showhovereffect,
                        fcChartObj.plothovereffect, fcChartObj.showhovereffect),
                    rolloverProperties = {},
                    hoverAttr = !!pluck(dataObj.hovercolor, dataset.hovercolor, fcChartObj.plotfillhovercolor,
                        dataObj.hoveralpha, dataset.hoveralpha, fcChartObj.plotfillhoveralpha,
                        dataObj.borderhovercolor, dataset.borderhovercolor, fcChartObj.plotborderhovercolor,
                        dataObj.borderhoveralpha, dataset.borderhoveralpha, fcChartObj.plotborderhoveralpha,
                        dataObj.borderhoverthickness, dataset.borderhoverthickness, fcChartObj.plotborderhoverthickness,
                        dataObj.hoverheight, dataset.hoverheight, fcChartObj.plothoverheight,
                        dataObj.hoverwidth, dataset.hoverwidth, fcChartObj.plothoverwidth,
                        dataObj.hoverradius, dataset.hoverradius, fcChartObj.plothoverradius, hoverEffect),
                    enabled = false,
                    color,
                    alpha,
                    fillColor;

                if ((hoverEffect === UNDEFINED && hoverAttr) || hoverEffect) {
                    enabled = true;
                    color = pluck(dataObj.hovercolor, dataset.hovercolor,
                        fcChartObj.plotfillhovercolor, getLightColor(defaults.color, 70));
                    alpha  = pluck(dataObj.hoveralpha, dataset.hoveralpha,
                        fcChartObj.plotfillhoveralpha, defaults.alpha);

                    rolloverProperties = {
                        stroke: convertColor(pluck(dataObj.borderhovercolor, dataset.borderhovercolor,
                            fcChartObj.plotborderhovercolor, defaults.borderColor),
                            pluckNumber(dataObj.borderhoveralpha, dataset.borderhoveralpha,
                            fcChartObj.plotborderhoveralpha, alpha, defaults.borderAlpha)),
                        'stroke-width': pluckNumber(dataObj.borderhoverthickness, dataset.borderhoverthickness,
                            fcChartObj.plotborderhoverthickness, defaults.borderThickness),
                        height: pluckNumber(dataObj.hoverheight, dataset.hoverheight,
                            fcChartObj.plothoverheight, defaults.height),
                        width: pluckNumber(dataObj.hoverwidth, dataset.hoverwidth,
                            fcChartObj.plothoverwidth, defaults.width),
                        r: pluckNumber(dataObj.hoverradius, dataset.hoverradius,
                            fcChartObj.plothoverradius, defaults.radius)
                    };

                    if (defaults.use3D) {
                        fillColor = this.getPointColor(getFirstColor(pluck(dataObj.hovercolor,
                            dataset.hovercolor, fcChartObj.plotfillhovercolor,
                                getLightColor(defaults.color, 70))),
                            pluck(dataObj.hoveralpha, dataset.hoveralpha,
                                fcChartObj.plotfillhoveralpha, defaults.alpha),
                            defaults.shapeType);
                    } else {
                        fillColor = convertColor(color, alpha);
                    }

                    rolloverProperties.fill = toRaphaelColor(fillColor);
                }

                return {
                    enabled: enabled,
                    rolloverProperties: rolloverProperties
                };
            },

            point: function(chartName, series, dataset, FCChartObj, HCObj,
                catLength, seriesIndex) {

                var chartApi = this,
                    ignoreEmptyDatasets = pluckNumber(FCChartObj.ignoreemptydatasets, 0),
                    conf = HCObj[CONFIGKEY],
                    NumberFormatter = chartApi.numberFormatter,
                    // Data array in dataset object
                    data = dataset.data,
                    dataLength = data && data.length,
                    // showValues attribute in individual dataset
                    datasetShowValues = pluckNumber(dataset.showvalues,
                        conf.showValues),
                    useRoundEdges = pluckNumber(FCChartObj.useroundedges),
                    hasValidPoint = false,
                    colorM = chartApi.colorManager,
                    itemValueY,
                    itemValueX,
                    index,
                    dataObj,
                    plotFillAlpha,
                    showPlotBorder,
                    plotBorderColor,
                    plotBorderThickness,
                    plotBorderAlpha,
                    use3DLighting,
                    datasetId,
                    datasetColor,
                    datasetAlpha,
                    datasetShowPlotBorder,
                    datasetPlotBorderColor,
                    datasetPlotBorderThickness,
                    datasetPlotBorderAlpha,
                    datasetAllowDrag,
                    UNDERSCORE = '_',
                    fillColor, shapeType,
                    //create the data parser
                    dataParser;

                //add z index so that the regration line set at the back of the series
                series.zIndex = 1;

                // Dataset seriesname
                series.name = getValidValue(dataset.seriesname);
                // dataset id
                datasetId = series.id = pluck(dataset.id, seriesIndex);

                // There is no dataset in data, we need to ignore the dataset.
                if (ignoreEmptyDatasets && !dataset.data) {
                    series.showInLegend = false;
                    return series;
                }

                // If showInLegend set to false
                // We set series.name blank
                if (pluckNumber(dataset.includeinlegend) === 0 ||
                    series.name === undefined) {
                    series.showInLegend = false;
                }


                //Plot Properties
                plotFillAlpha = pluck(FCChartObj.plotfillalpha, HUNDRED);
                showPlotBorder = pluckNumber(FCChartObj.showplotborder, 1);
                plotBorderColor = getFirstColor(pluck(FCChartObj.plotbordercolor, '666666'));
                plotBorderThickness = pluckNumber(FCChartObj.plotborderthickness,
                    useRoundEdges ? 2 : 1);
                plotBorderAlpha = pluck(FCChartObj.plotborderalpha, FCChartObj.plotfillalpha, useRoundEdges ?
                    '35' : '95');

                //Node Properties
                use3DLighting = Boolean(pluckNumber(FCChartObj.use3dlighting,
                    FCChartObj.is3d, useRoundEdges ? 1 : 0));
                //Store attributes
                datasetColor = getFirstColor(pluck(dataset.color, colorM.getPlotColor()));
                datasetAlpha = pluck(dataset.plotfillalpha, dataset.nodeFillAlpha, dataset.alpha, plotFillAlpha);
                //Data set plot properties
                datasetShowPlotBorder = Boolean(pluckNumber(dataset.showplotborder, showPlotBorder));
                datasetPlotBorderColor = getFirstColor(pluck(dataset.plotbordercolor, dataset.nodebordercolor,
                    plotBorderColor));
                datasetPlotBorderThickness = pluckNumber(dataset.plotborderthickness, dataset.nodeborderthickness,
                    plotBorderThickness);
                datasetPlotBorderAlpha = (datasetShowPlotBorder) ? pluck(dataset.plotborderalpha,
                    dataset.nodeborderalpha, dataset.alpha, plotBorderAlpha) : ZERO;
                //Drag Border properties
                datasetAllowDrag = Boolean(pluckNumber(dataset.allowdrag, 1));


                // Add marker to the series to draw the Legend
                series.marker = {
                    enabled: true,
                    fillColor: convertColor(datasetColor, datasetAlpha),
                    lineColor: {
                        FCcolor: {
                            color: datasetPlotBorderColor,
                            alpha: datasetPlotBorderAlpha
                        }
                    },
                    lineWidth: datasetPlotBorderThickness,
                    symbol: 'poly_4'
                };

                //create the data parser
                dataParser = series._dataParser = function(dataObj, index, itemValueX, itemValueY) {
                    var setId = pluck(dataObj.id, (datasetId + UNDERSCORE + index)),
                        allowDrag = Boolean(pluckNumber(dataObj.allowdrag, datasetAllowDrag)),
                        shape = getValidValue(dataObj.shape, 'rectangle').toLowerCase(),
                        height = getValidValue(dataObj.height, 10),
                        width = getValidValue(dataObj.width, 10),
                        radius = getValidValue(dataObj.radius, 10),
                        numSides = getValidValue(dataObj.numsides, 4),
                        color = getFirstColor(pluck(dataObj.color, datasetColor)),
                        alpha = pluck(dataObj.alpha, datasetAlpha),
                        imageURL = getValidValue(dataObj.imageurl),
                        imageNode = Boolean(pluckNumber(dataObj.imagenode)),
                        hoverEffects;

                    //If not required shape then set it to rectangle
                    switch (shape) {
                    case 'circle':
                        shapeType = 0;
                        break;
                    case 'polygon':
                        shapeType = 2;
                        shape = mapSymbolName(numSides);
                        break;
                    default:
                        shapeType = 1;
                        break;
                    }

                    if (use3DLighting) {
                        fillColor = chartApi.getPointColor(color, alpha, shapeType);
                    } else {
                        fillColor = convertColor(color, alpha);
                    }

                    // Point hover effects
                    hoverEffects = chartApi.pointHoverOptions(dataObj, dataset, FCChartObj, {
                        plotType: 'funnel',
                        shapeType: shapeType,
                        use3D: use3DLighting,
                        height: height,
                        width: width,
                        radius: radius,
                        color: color,
                        alpha: alpha,
                        borderColor: datasetPlotBorderColor,
                        borderAlpha: datasetPlotBorderAlpha,
                        borderThickness: datasetPlotBorderThickness
                    });

                    // Finally add the data
                    // we call getPointStub function that manage displayValue, toolText and link
                    return extend2(chartApi.getPointStub(dataObj,
                        itemValueY, NumberFormatter.xAxis(itemValueX),
                        HCObj, dataset, datasetShowValues), {
                        hoverEffects: hoverEffects,
                        _options: dataObj,
                        y: itemValueY,
                        x: itemValueX,
                        id: setId,
                        imageNode: imageNode,
                        imageURL: imageURL,
                        imageAlign: getValidValue(dataObj.imagealign, BLANK).toLowerCase(),
                        imageWidth: getValidValue(dataObj.imagewidth),
                        imageHeight: getValidValue(dataObj.imageheight),
                        labelAlign: pluck(dataObj.labelalign, imageNode &&
                            defined(imageURL) ? POSITION_TOP : POSITION_MIDDLE),
                        allowDrag: allowDrag,
                        marker: {
                            enabled: true,
                            fillColor: fillColor,
                            lineColor: {
                                FCcolor: {
                                    color: datasetPlotBorderColor,
                                    alpha: datasetPlotBorderAlpha
                                }
                            },
                            lineWidth: datasetPlotBorderThickness,
                            radius: radius,
                            height: height,
                            width: width,
                            symbol: shape
                        },
                        tooltipConstraint: chartApi.tooltipConstraint
                    });
                };

                // Iterate through all level data
                for (index = 0; index < dataLength; index += 1) {
                    // Individual data obj
                    // for further manipulation
                    dataObj = data[index];
                    if (dataObj) {
                        itemValueY = NumberFormatter.getCleanValue(dataObj.y);
                        itemValueX = NumberFormatter.getCleanValue(dataObj.x);

                        if (itemValueY === null) {
                            series.data.push({
                                _options: dataObj,
                                y: null
                            });
                        } else {
                            hasValidPoint = true;
                            //push the point object
                            series.data.push(dataParser(dataObj, index, itemValueX, itemValueY));

                            // Set the maximum and minimum found in data
                            // pointValueWatcher use to calculate the maximum and minimum value of the Axis
                            this.pointValueWatcher(HCObj, itemValueY, itemValueX);
                        }
                    }
                }

                // If all the values in current dataset is null we will not show
                // its legend.
                if (ignoreEmptyDatasets && !hasValidPoint) {
                    series.showInLegend = false;
                }

                return series;
            },
            // Function that produce the point color
            getPointColor: function(color, alpha, shapeType) {
                var colorObj, innerColor, outerColor;
                color = getFirstColor(color);
                alpha = getFirstAlpha(alpha);
                innerColor = getLightColor(color, 80);
                outerColor = getDarkColor(color, 65);
                colorObj = {
                    FCcolor: {
                        gradientUnits: OBJECTBOUNDINGBOX,
                        color: innerColor + COMMA + outerColor,
                        alpha: alpha + COMMA + alpha,
                        ratio: BGRATIOSTRING
                    }
                };

                if (shapeType) {
                    if (shapeType === 1) {
                        colorObj.FCcolor.angle = 0;
                    } else {
                        colorObj.FCcolor.angle = 180;
                    }
                } else {
                    colorObj.FCcolor.cx = 0.4;
                    colorObj.FCcolor.cy = 0.4;
                    colorObj.FCcolor.r = '50%';
                    colorObj.FCcolor.radialGradient = true;
                }

                return colorObj;
            },

            // Function to create tooltext for individual data points
            getPointStub: function(setObj, value, label, HCObj, dataset) {
                var iapi = this,
                    dataObj = iapi.dataObj,
                    FCChartObj = dataObj.chart,
                    conf = HCObj[CONFIGKEY],
                    formatedVal = (value === null ?
                        value : conf.numberFormatter.dataLabels(value)),
                    setTooltext = getValidValue(parseUnsafeString(pluck(setObj.tooltext, dataset.plottooltext,
                        conf.tooltext))),
                    tooltipSepChar = iapi.tooltipSepChar = conf.tooltipSepChar,
                    pointLabel = pluck(setObj.label, setObj.name),
                    safeLabel = parseUnsafeString(pointLabel),
                    seriesname,
                    toolTextStr = BLANK,
                    isUserTooltip = false,
                    toolText,
                    displayValue,
                    dataLink;

                //create the tooltext
                if (!conf.showTooltip) {
                    toolText = false;
                }
                // if tooltext is given in data object
                else if (setTooltext !== undefined) {
                    isUserTooltip = true;

                    toolText = parseTooltext(setTooltext, [3, 4, 5, 6, 8, 9, 10, 11], {
                        yaxisName: parseUnsafeString(FCChartObj.yaxisname),
                        xaxisName: parseUnsafeString(FCChartObj.xaxisname),
                        yDataValue: formatedVal,
                        xDataValue: label,
                        label: safeLabel
                    }, setObj, FCChartObj, dataset);
                } else if (pointLabel !== undefined) {
                    toolText = safeLabel;
                    isUserTooltip = true;
                } else { //determine the tooltext then
                    if (formatedVal === null) {
                        toolText = false;
                    } else {
                        if (conf.seriesNameInToolTip) {
                            seriesname = getFirstValue(dataset && dataset.seriesname);
                        }
                        toolText = toolTextStr = seriesname ? seriesname + tooltipSepChar : BLANK;
                        toolText += label ? label + tooltipSepChar : BLANK;
                        toolText += formatedVal;
                    }
                }

                //create the displayvalue
                displayValue = safeLabel;

                ////create the link
                dataLink = pluck(setObj.link);

                return {
                    displayValue: displayValue,
                    toolText: toolText,
                    link: dataLink,
                    _toolTextStr: toolTextStr,
                    _isUserTooltip: isUserTooltip
                };
            },

            //----  Parse the connector attributes  ----//
            connector: function(chartName, connectors, connectorsObj, FCChartObj,
                HCObj) {
                var conf = HCObj[CONFIGKEY],
                    smartLabel = conf.smartLabel,
                    connector = connectorsObj.connector,
                    length = connector && connector.length,
                    stdThickness,
                    conColor,
                    conAlpha,
                    conDashGap,
                    conDashLen,
                    conDashed,
                    arrowAtStart,
                    arrowAtEnd,
                    conStrength,
                    index,
                    seriesConnector,
                    parser,
                    toolText,
                    connectorsTooltext = getValidValue(parseUnsafeString(pluck(
                        connectorsObj.connectortooltext, FCChartObj.connectortooltext))),
                    defToolTextMacro = '$fromLabel' + conf.tooltipSepChar + '$toLabel';

                //Extract attributes of this node.
                stdThickness = pluckNumber(connectorsObj.stdthickness, 1);
                conColor = getFirstColor(pluck(connectorsObj.color, 'FF5904'));
                conAlpha = pluck(connectorsObj.alpha, HUNDRED);
                conDashGap = pluckNumber(connectorsObj.dashgap, 5);
                conDashLen = pluckNumber(connectorsObj.dashlen, 5);
                conDashed = Boolean(pluckNumber(connectorsObj.dashed, 0));
                arrowAtStart = Boolean(pluckNumber(connectorsObj.arrowatstart, 1));
                arrowAtEnd = Boolean(pluckNumber(connectorsObj.arrowatend, 1));
                conStrength = pluckNumber(connectorsObj.strength, 1);

                seriesConnector = connectors.connector;

                parser = connectors._connectorParser = function(connectorObj, index) {

                    //connector label.
                    var connectorLabel = parseUnsafeString(pluck(connectorObj.label, connectorObj.name)),
                        setConAlpha = pluck(connectorObj.alpha, conAlpha),
                        //setConColor = convertColor(getFirstColor(pluck(connectorObj.color, conColor)), setConAlpha);
                        setConColor = {
                            FCcolor: {
                                color: getFirstColor(pluck(connectorObj.color, conColor)),
                                alpha: setConAlpha
                            }
                        },
                        labelTextObj = smartLabel.getOriSize(connectorLabel),
                        connectorToolText = getValidValue(parseUnsafeString(pluck(connectorObj.tooltext,
                        connectorsTooltext)));

                    //create the tooltext
                    if (!conf.showTooltip) {
                        toolText = false;
                    } else { //determine the tooltext then
                        toolText = pluck(connectorToolText, connectorLabel ?
                            '$label' : defToolTextMacro);
                    }

                    return {
                        _options: connectorObj,
                        id: pluck(connectorObj.id, index).toString(),
                        from: pluck(connectorObj.from, BLANK),
                        to: pluck(connectorObj.to, BLANK),
                        label: connectorLabel,
                        toolText: toolText,
                        customToolText: connectorToolText,
                        color: setConColor,
                        dashStyle: Boolean(pluckNumber(connectorObj.dashed, conDashed)) ?
                            getDashStyle(pluckNumber(connectorObj.dashlen, conDashLen),
                                pluckNumber(connectorObj.dashgap, conDashGap), stdThickness) : undefined,
                        arrowAtStart: Boolean(pluckNumber(connectorObj.arrowatstart, arrowAtStart)),
                        arrowAtEnd: Boolean(pluckNumber(connectorObj.arrowatend, arrowAtEnd)),
                        conStrength: pluckNumber(connectorObj.strength, conStrength),
                        connectorLink: getValidValue(connectorObj.link),
                        stdThickness: stdThickness,
                        labelWidth: labelTextObj.widht,
                        labelHeight: labelTextObj.height
                    };
                };

                for (index = 0; index < length; index += 1) {
                    seriesConnector.push(parser(connector[index], index));
                }

                return connectors;
            },

            series: function(fc, HCObj, chartName) {
                var conf = HCObj[CONFIGKEY],
                    connectorsArr = [],
                    connectorCount,
                    connectors,
                    datasetLength,
                    seriesArr,
                    series,
                    length,
                    index;

                //enable the legend
                HCObj.legend.enabled = Boolean(pluckNumber(fc.chart.showlegend, 1));

                if (fc.dataset && (datasetLength = fc.dataset.length) > 0) {
                    // add category
                    this.categoryAdder(fc, HCObj);
                    //remove xaxis auto numeric labels
                    conf.x.requiredAutoNumericLabels = false;

                    //add connectors
                    if (fc.connectors && (connectorCount = fc.connectors.length)) {
                        for (index = 0, length = connectorCount; index < length; index += 1) {
                            connectors = {
                                connector: []
                            };
                            connectorsArr.push(this.connector(chartName, connectors,
                                fc.connectors[index], fc.chart, HCObj, conf.oriCatTmp.length,
                                index));
                        }
                    } else { // If there is not connectors in the initial data
                        // we forcefully call the connector function so that
                        // connector can be added later using menu.
                        connectors = {
                            connector: []
                        };
                        connectorsArr.push(this.connector(chartName, connectors, {}, fc.chart, HCObj,
                            conf.oriCatTmp.length, index));
                    }

                    //add data series
                    for (index = 0; index < datasetLength; index += 1) {
                        series = {
                            hoverEffects: this.parseSeriesHoverOptions(fc, HCObj, fc.dataset[index], chartName),
                            data: []
                        };
                        //add data to the series
                        seriesArr = this.point(chartName, series,
                            fc.dataset[index], fc.chart, HCObj, conf.oriCatTmp.length,
                            index);


                        //if the returned series is an array of series (case: pareto)
                        if (seriesArr instanceof Array) {
                            HCObj.series = HCObj.series.concat(seriesArr);
                        }
                        //all other case there will be only1 series
                        else {
                            HCObj.series.push(seriesArr);
                        }
                    }

                    HCObj.connectors = connectorsArr;

                    //add all labels
                    if (fc.labels && fc.labels.label && fc.labels.label.length > 0) {
                        HCObj.dragableLabels = fc.labels.label;
                    }
                    fc.chart.showyaxisvalue = pluck(fc.chart.showyaxisvalue, 0);
                    ///configure the axis
                    this.configureAxis(HCObj, fc);
                    ///////////Trend-lines /////////////////
                    if (fc.trendlines) {
                        createTrendLine(fc.trendlines, HCObj.yAxis, conf,
                            false, this.isBar);
                    }

                }
            }
        }, chartAPI.scatterbase);

        /**
         * Drag Node Series
         */
        // 1 - Set default options
        ///function to add the arrow point
        function drawArrow(X1, Y1, X2, Y2, R, H) {
            var tanganent = (Y1 - Y2) / (X1 - X2),
                angle = math.atan(tanganent),
                PX, PY, RHlf, HHlf,
                arr = [];


            //make all angle as positive
            if (angle < 0) {
                angle = (2 * math.PI) + angle;
            }
            if (Y2 > Y1) { ///PI >angle > 0
                if ((X2 >= X1 && angle > math.PI) || (X2 < X1 && angle > math.PI)) {
                    angle = angle - math.PI;
                }
            } else { /// PI <= angle < 360 || angle == 0
                //angle may not be 360 in that case it will be 0 as atan work
                if ((X2 >= X1 && angle < math.PI && angle !== 0) || (X2 < X1 && angle < math.PI)) {
                    angle = angle + math.PI;
                }
            }

            if (typeof H == 'undefined') {
                ///arrow start point
                PX = X1 + (R * mathCos(angle));
                PY = Y1 + (R * mathSin(angle));
            } else { ///rectangle
                RHlf = mathAbs(R) / 2;
                HHlf = mathAbs(H) / 2;

                //asume it will intersect a vertical side
                PX = X1 + (RHlf = X1 < X2 ? RHlf : -RHlf);
                PY = Y1 + (RHlf * math.tan(angle));
                //validate PY
                //if not validate then it will cross the horizontal axis
                if (mathAbs(Y1 - PY) > mathAbs(HHlf)) {
                    PY = Y1 + (HHlf = Y1 < Y2 ? HHlf : -HHlf);
                    PX = X1 + (HHlf / math.tan(angle));
                }
            }

            arr.push(L, PX, PY,
                ///arrowone half
                PX + (10 * mathCos(angle + 0.79)),
                PY + (10 * mathSin(angle + 0.79)),
                ///arrowone half
                M, PX + (10 * mathCos(angle - 0.79)),
                PY + (10 * mathSin(angle - 0.79)),
                //return to th eedege
                L, PX, PY);

            return arr;
        }

        // store the points by its point id.
        // define the connector class
        ConnectorClass = function(connectorOptions, pointStore, style, paper,
            connectorsGroup, chart) {
            var connector = this,
                chartLogic = chart.logic,
                fromId = connectorOptions.from,
                toId = connectorOptions.to,
                strokeWidth, color, textBgColor,
                fromPointObj = pointStore[fromId],
                toPointObj = pointStore[toId],
                eventArgs = {
                    sourceType: 'connector'
                },
                options = connectorOptions && connectorOptions._options,
                NumberFormatter = chartLogic.numberFormatter,
                tooltext,
                fromX,
                fromY,
                toX,
                toY,
                label,
                downTimer,
                mouseOut,
                mouseDown,
                clickFN;

            connector.renderer = paper;
            connector.connectorsGroup = connectorsGroup;
            connector.pointStore = pointStore;
            connector.options = connectorOptions;
            connector.style = style || {};
            if (fromPointObj && toPointObj) {
                connector.fromPointObj = fromPointObj;
                connector.toPointObj = toPointObj;
                connector.fromX = fromX = fromPointObj._xPos;
                connector.fromY = fromY = fromPointObj._yPos;
                connector.toX = toX = toPointObj._xPos;
                connector.toY = toY = toPointObj._yPos;
                connector.arrowAtStart = eventArgs.arrowAtStart = connectorOptions.arrowAtStart;
                connector.arrowAtEnd = eventArgs.arrowAtEnd = connectorOptions.arrowAtEnd;
                connector.strokeWidth = strokeWidth = (connectorOptions.conStrength * connectorOptions.stdThickness);
                connector.color = color = connectorOptions.color;
                connector.textBgColor = textBgColor = color && color.FCcolor &&
                    color.FCcolor.color;
                connector.label = eventArgs.label = label = connectorOptions.label;
                tooltext = parseTooltext(connectorOptions.toolText, [3, 83,
                    84, 85, 86, 87, 88, 89, 90, 91, 92
                ], {
                    label: connectorOptions.label,
                    fromXValue: NumberFormatter.dataLabels(fromPointObj.x),
                    fromYValue: NumberFormatter.dataLabels(fromPointObj.y),
                    fromXDataValue: fromPointObj.x,
                    fromYDataValue: fromPointObj.y,
                    fromLabel: pluck(fromPointObj.displayValue, fromPointObj.id),
                    toXValue: NumberFormatter.dataLabels(toPointObj.x),
                    toYValue: NumberFormatter.dataLabels(toPointObj.y),
                    toXDataValue: toPointObj.x,
                    toYDataValue: toPointObj.y,
                    toLabel: pluck(toPointObj.displayValue, toPointObj.id)
                });
                connector.link = eventArgs.link = options && options.link;

                eventArgs.id = connectorOptions.id;
                eventArgs.fromNodeId = fromPointObj.id;
                eventArgs.toNodeId = toPointObj.id;

                fromPointObj._config && fromPointObj._config.startConnectors &&
                    fromPointObj._config.startConnectors.push(connector);
                toPointObj._config && toPointObj._config.endConnectors &&
                    toPointObj._config.endConnectors.push(connector);
                //function to stop longpress event
                mouseOut = function() {
                    downTimer = clearTimeout(downTimer);
                };
                //fire long press event
                mouseDown = function() {
                    var ele = this,
                        options = connectorOptions._options || {};

                    ele._longpressactive = clearTimeout(ele._longpressactive);

                    // Whether to fire the click event ot not
                    ele.data('fire_click_event', 1);

                    ele._longpressactive = setTimeout(function() {

                        // Whether to fire the click event ot not
                        ele.data('fire_click_event', 0);

                        if (!ele.data('viewMode')) {
                            //add a selection method for start and end
                            chartLogic.showConnectorUpdateUI(chart, {
                                fromid: {
                                    val: options.from,
                                    innerHTML: OPTIONSTR + options.from + OPTIONCLOSESTR,
                                    disabled: true
                                },
                                toid: {
                                    val: options.to,
                                    innerHTML: OPTIONSTR + options.to + OPTIONCLOSESTR,
                                    disabled: true
                                },
                                arratstart: {
                                    val: Boolean(pluckNumber(options.arrowatstart, 1))
                                },
                                arratend: {
                                    val: Boolean(pluckNumber(options.arrowatend, 1))
                                },
                                dashed: {
                                    val: pluckNumber(options.dashed)
                                },
                                dashgap: {
                                    val: options.dashgap
                                },
                                dashlen: {
                                    val: options.dashlen
                                },
                                label: {
                                    val: options.label
                                },
                                tooltext: {
                                    val: options.tooltext
                                },
                                id: {
                                    val: connectorOptions.id,
                                    disabled: true
                                },
                                strength: {
                                    val: options.strength
                                },
                                alpha: {
                                    val: options.alpha
                                },
                                color: {
                                    val: options.color
                                }
                            }, true);
                        }
                    }, CLEAR_TIME_1000);
                };
                //click Function
                clickFN = function() {
                    chartLogic.linkClickFN.call(connector);
                };

                //draw the line
                connector.graphic = paper.path(connector.getlinePath(),
                    connectorsGroup)
                    .attr({
                        'stroke-width': strokeWidth,
                        ishot: true,
                        'stroke-dasharray': connectorOptions.dashStyle,
                        cursor: connector.link ? 'pointer' : '',
                        stroke: toRaphaelColor(color)
                    })
                    .mousedown(mouseDown)
                    .mousemove(function() {
                        // Whether to fire the click event ot not
                        this.data('fire_click_event', 0);
                        clearLongPress.call(this);
                    })
                    .mouseup(function(data) {
                        var ele = this;

                        clearLongPress.call(ele);
                        plotEventHandler.call(ele, chart, data, 'ConnectorClick');
                    })
                    .hover(function(data) {
                        var ele = this;
                        plotEventHandler.call(ele, chart, data, 'ConnectorRollover');
                    }, function(data) {
                        var ele = this;
                        plotEventHandler.call(ele, chart, data, 'ConnectorRollout');
                    })
                    .tooltip(tooltext)
                    .data('eventArgs', eventArgs)
                    .data('viewMode', chart.options.chart.viewMode);

                if (label) {
                    // Drawing the connector Label
                    connector.text = paper.text();
                    connectorsGroup.appendChild(connector.text);
                    connector.text
                        .css(style)
                        .attr({
                            text: label,
                            x: (fromX + toX) / 2,
                            y: (fromY + toY) / 2,
                            fill: style.color,
                            ishot: true,
                            cursor: connector.link ? 'pointer' : '',
                            'text-bound': [pluck(style.backgroundColor, textBgColor),
                                pluck(style.borderColor, textBgColor), 1, '2'
                            ]
                        })
                        .tooltip(tooltext)
                        .mousedown(mouseDown)
                        .mousemove(function() {
                            // Whether to fire the click event ot not
                            this.data('fire_click_event', 0);
                            clearLongPress.call(this);
                        })
                        .hover(function(data) {
                            var ele = this;
                            plotEventHandler.call(ele, chart, data, 'ConnectorRollover');
                        }, function(data) {
                            var ele = this;
                            plotEventHandler.call(ele, chart, data, 'ConnectorRollout');
                        })
                        .mouseup(function(data) {
                            var ele = this;

                            clearLongPress.call(ele);
                            plotEventHandler.call(ele, chart, data, 'ConnectorClick');
                        })
                        .tooltip(tooltext)
                        .data('eventArgs', eventArgs)
                        .data('viewMode', chart.options.chart.viewMode);
                }
            }
        };
        ConnectorClass.prototype = {
            updateFromPos: function(x, y) {
                var connector = this;
                connector.fromX = x;
                connector.fromY = y;
                connector.graphic && connector.graphic.animate({
                    path: connector.getlinePath()
                });

                connector.text && connector.text.animate({
                    x: (connector.fromX + connector.toX) / 2,
                    y: (connector.fromY + connector.toY) / 2
                });
            },
            updateToPos: function(x, y) {
                var connector = this;
                connector.toX = x;
                connector.toY = y;
                connector.graphic && connector.graphic.animate({
                    path: connector.getlinePath()
                });

                connector.text && connector.text.animate({
                    x: (connector.fromX + connector.toX) / 2,
                    y: (connector.fromY + connector.toY) / 2
                });
            },
            getlinePath: function() {
                var connector = this,
                    fromPointObj = connector.fromPointObj,
                    toPointObj = connector.toPointObj,
                    fromX = connector.fromX,
                    fromY = connector.fromY,
                    toX = connector.toX,
                    toY = connector.toY,
                    path = [M, fromX, fromY],
                    config;

                if (connector.arrowAtStart) {
                    config = fromPointObj._config;
                    if (config.shapeType === SHAPE_RECT) {
                        path = path.concat(drawArrow(fromX, fromY, toX, toY,
                            config.shapeArg.width, config.shapeArg.height));
                    } else {
                        path = path.concat(drawArrow(fromX, fromY, toX, toY,
                            config.shapeArg.radius));
                    }
                }

                // Calculating path for connector Arrow
                if (connector.arrowAtEnd) {
                    config = toPointObj._config;
                    if (config.shapeType === SHAPE_RECT) {
                        path = path.concat(drawArrow(toX, toY, fromX, fromY,
                            config.shapeArg.width, config.shapeArg.height));
                    } else {
                        path = path.concat(drawArrow(toX, toY, fromX, fromY,
                            config.shapeArg.radius));
                    }
                }
                path.push(L, toX, toY);
                return path;
            }
        };

        ConnectorClass.prototype.constructor = ConnectorClass;

        dragChartsComponents = {
            //prevent click at the end of drag
            mouseDown: function(event) {
                delete event.data.point.dragActive;
            },
            //prevent click
            click: function(event) {
                return !event.data.point.dragActive;
            },
            //drag handeler for drag charts
            dragHandler: function(event) {
                var config = event.data,
                    type = event.type,
                    point = config.point,
                    series = config.series,
                    chart = series.chart || series,
                    toolTip = chart.tooltip,
                    touchEvent = (hasTouch && getTouchEvent(event)) || stubEvent,
                    iapi = chart.options.instanceAPI,
                    eventArgsArr,
                    eventArgs;

                switch (type) {
                case DRAGSTART:
                    toolTip.block(true);
                    config.dragStartY = event.pageY || touchEvent.pageY || 0;
                    config.dragStartX = event.pageX || touchEvent.pageX || 0;
                    config.startValue = point.y;
                    config.startXValue = point.x;
                    point.dragActive = true;
                    series.dragStartHandler && series.dragStartHandler(config);
                    break;
                case DRAGEND:
                    toolTip.block(false);
                    series.repositionItems(config, config.changeX ?
                        (event.pageX || touchEvent.pageX || 0) - config.dragStartX : 0,
                        config.changeY ? (event.pageY || touchEvent.pageY || 0) -
                        config.dragStartY : 0, true);

                    eventArgs = {
                        dataIndex: point.index + 1,
                        datasetIndex: series.index + 1,
                        startValue: config.startValue,
                        endValue: point.y,
                        datasetName: series.name
                    };
                    eventArgsArr = [
                        iapi.chartInstance.id,
                        eventArgs.dataIndex,
                        eventArgs.datasetIndex,
                        eventArgs.datasetName,
                        eventArgs.startValue,
                        eventArgs.endValue
                    ];
                    if (config.changeX) {
                        eventArgs.startYValue = config.startValue;
                        eventArgs.endYValue = point.y;
                        eventArgs.startXValue = config.startXValue;
                        eventArgs.endXValue = point.x;
                        eventArgsArr.push(config.startXValue, point.x);
                        delete eventArgs.startValue;
                        delete eventArgs.endValue;
                    }

                    // Fire the ChartUpdated event
                    // Documented in 'powercharts.js'

                    lib.raiseEvent('chartupdated', eventArgs, iapi.chartInstance,
                        eventArgsArr);

                    delete config.dragStartY;
                    delete config.dragStartX;
                    delete config.startValue;
                    delete config.startXValue;
                    break;
                default:
                    series.repositionItems(config, config.changeX ?
                        (event.pageX || touchEvent.pageX || 0) - config.dragStartX : 0,
                        config.changeY ? (event.pageY || touchEvent.pageY || 0) -
                        config.dragStartY : 0);
                    break;
                }
            },
            //handaler for dragable labels
            dragLabelHandler: function(event) {
                var config = event.data,
                    type = event.type,
                    element = config.element,
                    tracker = config.tracker,
                    toolTip = config.toolTip,
                    touchEvent = (hasTouch && getTouchEvent(event)) || stubEvent,
                    series = config.series,
                    reflowUpdate,
                    px,
                    py,
                    leftPos,
                    topPos;
                if (type === DRAGSTART) {
                    toolTip.block(true);
                    config.dragStartY = event.pageY || touchEvent.pageY || 0;
                    config.dragStartX = event.pageX || touchEvent.pageX || 0;
                } else {
                    px = config.x + (event.pageX || touchEvent.pageX || 0) - config.dragStartX;
                    leftPos = px - config.leftDistance;
                    if (leftPos + config.width > config.plotWidth) {
                        leftPos = config.plotWidth - config.width;
                    }
                    if (leftPos < 0) {
                        leftPos = 0;
                    }

                    px = leftPos + config.leftDistance;

                    py = config.y + (event.pageY || touchEvent.pageY || 0) - config.dragStartY;
                    topPos = py - config.topDistance;
                    if (topPos + config.height > config.plotHeight) {
                        topPos = config.plotHeight - config.height;
                    }
                    if (topPos < 0) {
                        topPos = 0;
                    }
                    py = topPos + config.topDistance;
                    if (type === DRAGEND) {
                        toolTip.block(false);
                        config.x = px;
                        config.y = py;
                        delete config.dragStartY;
                        delete config.dragStartX;
                    } else {
                        element.attr({
                            x: px,
                            y: py
                        })
                            .textBound();
                        tracker.attr({
                            x: leftPos,
                            y: topPos
                        });
                    }
                }
                if (type == 'dragend') {
                    //Store currend updated x, y for resize
                    // Save state
                    reflowUpdate = {
                        hcJSON: {
                            dragableLabels: []
                        }
                    };
                    reflowUpdate.hcJSON.dragableLabels[config.index] = {
                        y: series.yAxis.translate(series.chart.plotHeight - py +
                            config.yAdjustment, 1),
                        x: series.xAxis.translate(px, 1)
                    };
                    extend2(series.chart.options.instanceAPI.chartInstance.jsVars._reflowData, reflowUpdate, true);
                }
            },

            pointUpdate: function(point, formattedVal, value) {
                if (!point._isUserTooltip && point.toolText !== BLANK && !point._getTooltext) {
                    point.toolText = point._toolTextStr + formattedVal;
                }
                else if (point._getTooltext){
                    point.toolText = point._getTooltext(undefined, undefined, {formattedValue: formattedVal},
                        {value: value});
                }
                if (!point._isUserValue && point.displayValue !== BLANK) {
                    point.displayValue = formattedVal;
                }
            },

            snapPoint: function(chart, dataObj, y) {
                var chartOptions = chart.options.chart,
                    snapToDiv = chartOptions.snapToDiv,
                    snapToDivOnly = chartOptions.snapToDivOnly,
                    plotLines = chart._yAxisPlotLines,
                    plotLinesGap = mathAbs(plotLines[1] - plotLines[0]),
                    snapPixel = snapToDivOnly ? plotLinesGap * 0.5 :
                        chartOptions.snapToDivRelaxation,
                    length = plotLines.length,
                    lastSnap = dataObj.lastSnap,
                    outOfRange = 1,
                    index = length,
                    divLineDiff;

                while (index--) {
                    divLineDiff = mathAbs(plotLines[index] - y);
                    if (snapToDiv && divLineDiff < snapPixel) {
                        if (lastSnap !== index) {
                            dataObj.lastSnap = snapToDivOnly ? undefined : index;
                            y = plotLines[index];
                        }
                        outOfRange = 0;
                        break;
                    }
                }
                if (outOfRange) {
                    dataObj.lastSnap = undefined;
                }
                return y;
            },

            setMinMaxValue: function(chart) {
                var seriesArr = chart.options.series,
                    iapi = chart.logic,
                    index = 0,
                    min = Infinity,
                    max = -Infinity,
                    reflowData = iapi.chartInstance.jsVars._reflowData,
                    seriesLen,
                    value,
                    data,
                    len,
                    ind;

                for (ind = 0, seriesLen = seriesArr.length; ind < seriesLen; ind += 1) {
                    data = seriesArr[ind] && seriesArr[ind].data;
                    for (index = 0, len = data.length; index < len; index += 1) {
                        value = data[index].y;

                        if (value !== null) {
                            max = max > value ? max : value;
                            min = min < value ? min : value;
                        }
                    }
                }

                iapi.highValue = max;
                iapi.lowValue = min;

                reflowData.postHCJSONCreation = function() {
                    var iapi = this,
                        hc = iapi.hcJSON,
                        conf = hc[CONFIGKEY],
                        axisConf = conf[0];
                    axisConf.min = min;
                    axisConf.max = max;
                };
            },

            setSelectBoxValues: function(point, chart) {
                var xAxis = chart.xAxis[0],
                    yAxis = chart.yAxis[0],
                    plotHeight = chart.plotHeight;

                point.startX = xAxis.translate(point.left, 1);
                point.endX = xAxis.translate(point.left + point.width, 1);
                point.startY = yAxis.translate(plotHeight - point.top, 1);
                point.endY = yAxis.translate(plotHeight -
                    (point.top + point.height), 1);
            }
        };

        /******    Dragable Charts    ******/
        /////////////// DragArea ///////////
        chartAPI('dragarea', extend({
            friendlyName: 'Dragable Area Chart',
            standaloneInit: true,
            creditLabel: creditLabel,
            rendererId: 'dragarea',
            defaultSeriesType: 'area',
            decimals: 2,
            anchorAlpha: '100',
            eiMethods: chartAPI.msareabase.eiMethods
        }, dragExtension), chartAPI.msareabase);

        /////////////// DragLine ///////////
        chartAPI('dragline', extend({
            friendlyName: 'Dragable Line Chart',
            standaloneInit: true,
            creditLabel: creditLabel,
            decimals: 2,
            defaultSeriesType: 'line',
            rendererId: 'dragline',
            eiMethods: chartAPI.mslinebase.eiMethods
        }, dragExtension), chartAPI.mslinebase);

        /* ************************************************************************
         * Start DragLine series code                                      *
         **************************************************************************/
        // 1 - Set default options
        /////////////// DragArea ///////////
        chartAPI('dragcolumn2d', extend({
            friendlyName: 'Dragable Column Chart',
            standaloneInit: true,
            creditLabel: creditLabel,
            decimals: 2,
            defaultSeriesType: 'column',
            rendererId: 'dragcolumn2d',
            eiMethods: chartAPI.mscolumn2dbase.eiMethods
        }, dragExtension), chartAPI.mscolumn2dbase);

        /* ************************************************************************
         * Start DragColumn2D series code                                         *
         **************************************************************************/
        // 1 - Set default options

        /////////////// SelectScatter ///////////
        chartAPI('selectscatter', {
            friendlyName: 'Dragable Scatter Chart',
            isXY: true,
            standaloneInit: true,
            creditLabel: creditLabel,
            defaultSeriesType: 'scatter',
            defaultZeroPlaneHighlighted: false,
            spaceManager: dragExtension.spaceManager,
            drawButtons: dragExtension.drawButtons,

            updateChartWithData: dragExtension.updateChartWithData,
            eiMethods: extend(extend(extend({}, chartAPI.scatterbase.eiMethods),
                dragExtension.eiMethods), {
                getData: function(format) {
                    // create a two dimensional array as given in the docs
                    var vars = this.jsVars,
                        iapi = vars.instanceAPI,
                        dataObj = iapi.getCollatedData(),
                        returnObj = [],
                        datasets = dataObj.dataset,
                        length = (datasets && datasets.length) || 0,
                        index = 0,
                        NULLSTR = 'null',
                        dsInd = 0,
                        setLen,
                        set,
                        j;


                    // When a format is provided
                    if (format) {
                        // no transcoding needed for json
                        if (/^json$/ig.test(format)) {
                            returnObj = dataObj;
                        } else if (/^csv$/ig.test(format)) {
                            returnObj = iapi.getCSVString();
                        } else {
                            returnObj = global.core.transcodeData(dataObj,
                                'json', format);
                        }
                    }
                    // if no format has been specified, return data as 2d array.
                    else {
                        //while (length--) {
                        for (; index < length; index += 1) {
                            set = datasets[index];
                            if (set) {
                                set = datasets[index] && datasets[index].data;
                                j = setLen = (set && set.length) || 0;
                                j && (returnObj[dsInd] || (returnObj[dsInd] = [getValidValue(datasets[index].id,
                                    NULLSTR)]));
                                while (j--) {
                                    returnObj[dsInd][j + 1] = getValidValue(set[j].id, NULLSTR);
                                }

                                setLen && (dsInd += 1);
                            }
                        }
                    }
                    return returnObj;
                }
            }),

            getCSVString: function() {
                var api = this,
                    fcObj = api.chartInstance,
                    dataObj = fcObj.getData(),
                    i = dataObj.length;

                while (i--) {
                    dataObj[i] = dataObj[i].join(',');
                }

                return dataObj.join('|');
            },
            getCollatedData: function() {
                var api = this,
                    fcObj = api.chartInstance,
                    vars = fcObj.jsVars,
                    hcObj = vars.hcObj,
                    selectedArr = hcObj._selectEleArr,
                    len = selectedArr && selectedArr.length,
                    origChartData = extend2({}, fcObj.getChartData(global.dataFormats.JSON)),
                    origDataSets = origChartData.dataset,
                    xPos,
                    yPos,
                    oriDataArr,
                    selectionBoxObj,
                    lenDS,
                    setObj,
                    dataLen,
                    startX,
                    endX,
                    startY,
                    endY,
                    selectedData = [];

                while (len--) {
                    selectionBoxObj = selectedArr[len];
                    if (!selectionBoxObj) {
                        continue;
                    }
                    startX = selectionBoxObj.startX;
                    endX = selectionBoxObj.endX;
                    startY = selectionBoxObj.startY;
                    endY = selectionBoxObj.endY;
                    lenDS = origDataSets.length;

                    while (lenDS--) {
                        selectedData[lenDS] || (selectedData[lenDS] = {
                            data: []
                        });
                        oriDataArr = origDataSets[lenDS].data;
                        dataLen = oriDataArr && oriDataArr.length;
                        while (dataLen--) {
                            setObj = oriDataArr[dataLen];
                            xPos = setObj.x;
                            yPos = setObj.y;
                            if (xPos > startX && xPos < endX &&
                                yPos < startY && yPos > endY) {
                                selectedData[lenDS].data[dataLen] = true;
                            }
                        }
                    }
                }

                lenDS = origDataSets.length;
                while (lenDS--) {
                    oriDataArr = origDataSets[lenDS].data;
                    dataLen = oriDataArr && oriDataArr.length;
                    while (dataLen--) {
                        if (!(selectedData[lenDS] && selectedData[lenDS].data[dataLen])) {
                            oriDataArr.splice(dataLen, 1);
                        }
                    }
                }

                //state.hasStaleData = false;
                return (api.updatedDataObj = origChartData);
            },

            createSelectionBox: function(event) {
                var chart = event.chart,
                    paper = chart.paper,
                    chartOptions = chart.options.chart,
                    yAxis = chart.yAxis && chart.yAxis[0],
                    xAxis = chart.xAxis && chart.xAxis[0],
                    x = event.selectionLeft,
                    y = event.selectionTop,
                    width = event.selectionWidth,
                    height = event.selectionHeight,
                    x2 = x + width,
                    y2 = y + height,
                    TRACKER_WIDTH = 12,
                    TRACKER_HALF_WIDTH = TRACKER_WIDTH * 0.5,
                    trackerRadius = 12,
                    resizeInnerSymbolColor = '#999999',
                    resizeOuterSymbolColor = '#777777',
                    closeButtonRadius = 6,
                    cornerSymbolRadius = 15,
                    isSmall = width > cornerSymbolRadius &&
                        height > cornerSymbolRadius,
                    selectEleObj = {
                        resizeEleRadius: cornerSymbolRadius,
                        canvasTop: chart.canvasTop,
                        canvasRight: chart.canvasLeft + chart.canvasWidth,
                        canvasLeft: chart.canvasLeft,
                        canvasBottom: chart.canvasTop + chart.canvasHeight
                    },
                    trackerG = chart.layers.tracker,
                    selectEleArr = chart._selectEleArr || (chart._selectEleArr = []),
                    selectBoxG;

                //var TRACKER_FILL = 'rgba(255,0,0,0.3)';

                selectEleObj.index = selectEleArr.length;
                selectEleObj.id = 'SELECT_' + selectEleObj.index;

                selectEleObj.selectBoxG = selectBoxG = paper.group('selection-box',
                    trackerG).toFront();

                // Drawing the main box element
                selectEleObj.selectBoxTracker = paper.rect(x, y, width, height, selectBoxG)
                    .attr({
                        'stroke-width': 1,
                        stroke: toRaphaelColor(chartOptions.selectBorderColor),
                        ishot: true,
                        fill: chartOptions.selectFillColor
                    })
                    .css({
                        cursor: 'move'
                    });
                selectEleObj.selectBoxTracker.data('config', {
                    position: 6, // MOVE
                    selectEleObj: selectEleObj,
                    xChange: true,
                    yChange: true
                });

                // Draw top tracker element
                selectEleObj.topTracker = paper.rect(x, y -
                    TRACKER_HALF_WIDTH, width, TRACKER_WIDTH, selectBoxG)
                    .attr({
                        'stroke-width': 0,
                        ishot: true,
                        fill: TRACKER_FILL
                    })
                    .css('cursor', hasSVG && 'ns-resize' || 'n-resize');
                selectEleObj.topTracker.data('config', {
                    position: 1, // TOP
                    selectEleObj: selectEleObj,
                    yChange: true
                });

                // Draw right tracker element
                selectEleObj.rightTracker = paper.rect(x + width -
                    TRACKER_HALF_WIDTH, y, TRACKER_WIDTH, height, selectBoxG)
                    .attr({
                        'stroke-width': 0,
                        ishot: true,
                        fill: TRACKER_FILL
                    })
                    .css('cursor', hasSVG && 'ew-resize' || 'w-resize');
                selectEleObj.rightTracker.data('config', {
                    position: 2, // RIGHT
                    selectEleObj: selectEleObj,
                    xChange: true
                });

                // Draw bottom tracker element
                selectEleObj.bottomTracker = paper.rect(x, y + height -
                    TRACKER_HALF_WIDTH, width, TRACKER_WIDTH, selectBoxG)
                    .attr({
                        'stroke-width': 0,
                        ishot: true,
                        fill: TRACKER_FILL
                    })
                    .css('cursor', hasSVG && 'ns-resize' || 'n-resize');
                selectEleObj.bottomTracker.data('config', {
                    position: 3, // BOTTOM
                    selectEleObj: selectEleObj,
                    yChange: true
                });

                // Draw left tracker element
                selectEleObj.leftTracker = paper.rect(x - TRACKER_HALF_WIDTH, y,
                    TRACKER_WIDTH, height, selectBoxG)
                    .attr({
                        'stroke-width': 0,
                        ishot: true,
                        fill: TRACKER_FILL
                    })
                    .css('cursor', hasSVG && 'ew-resize' || 'e-resize');
                selectEleObj.leftTracker.data('config', {
                    position: 4, // LEFT
                    selectEleObj: selectEleObj,
                    xChange: true
                });

                selectEleObj.cornerInnerSymbol = paper.symbol('resizeIcon', 0, 0,
                    cornerSymbolRadius, selectBoxG)
                    .attr({
                        transform: t + x2 + COMMA + y2,
                        'stroke-width': 1,
                        visibility: isSmall ? VISIBLE : HIDDEN,
                        ishot: true,
                        stroke: resizeInnerSymbolColor
                    });

                selectEleObj.cornerOuterSymbol = paper.symbol('resizeIcon', 0, 0, -cornerSymbolRadius * 0.8, selectBoxG)
                    .attr({
                        transform: t + x2 + COMMA + y2,
                        strokeWidth: 1,
                        visibility: !isSmall ? VISIBLE : HIDDEN,
                        ishot: true,
                        stroke: resizeOuterSymbolColor
                    });

                selectEleObj.resizeTracker = paper.circle(x2, y2, trackerRadius, selectBoxG)
                    .attr({
                        'stroke-width': 1,
                        stroke: TRACKER_FILL,
                        ishot: true,
                        fill: TRACKER_FILL
                    })
                    .css('cursor', hasSVG && 'nwse-resize' || 'nw-resize');
                selectEleObj.resizeTracker.data('config', {
                    position: 5, // Corner
                    selectEleObj: selectEleObj,
                    yChange: true,
                    xChange: true
                });

                selectEleObj.closeButton = paper.symbol('closeIcon', 0, 0, closeButtonRadius, selectBoxG)
                    .attr({
                        transform: 't' + x2 + ',' + y,
                        'stroke-width': 2,
                        stroke: chartOptions.selectionCancelButtonBorderColor,
                        fill: chartOptions.selectionCancelButtonFillColor,
                        'stroke-linecap': 'round',
                        ishot: true,
                        'stroke-linejoin': 'round'
                    })
                    .css({
                        cursor: 'pointer',
                        _cursor: 'hand'
                    })
                    .click(function() { // Delete the selection
                        chart.logic.deleteSelection(this, chart);
                    });
                selectEleObj.closeButton.data('config', {
                    index: selectEleObj.index
                });

                selectEleObj.chart = chart;
                selectEleObj.startX = xAxis.getAxisPosition(x, 1);
                selectEleObj.startY = yAxis.getAxisPosition(y, 1);
                selectEleObj.endX = xAxis.getAxisPosition(x2, 1);
                selectEleObj.endY = yAxis.getAxisPosition(y2, 1);
                selectEleObj.isVisible = true;

                selectEleArr.push(selectEleObj);
                chart.logic.bindDragEvent(selectEleObj);
            },

            deleteSelection: function(ele, chart) {
                var index = ele.data('config').index,
                    selectEleArr = chart._selectEleArr,
                    selectEleObj = selectEleArr[index],
                    selectT = selectEleObj.selectBoxTracker,
                    selectEleItem,
                    items,
                    bBox,
                    eventArgs;
                bBox = selectT.getBBox();
                eventArgs = {
                    selectionLeft: bBox.x,
                    selectionTop: bBox.y,
                    selectionWidth: bBox.width,
                    selectionHeight: bBox.height,
                    startXValue: chart.xAxis[0].getAxisPosition(bBox.x, 1),
                    startYValue: chart.yAxis[0].getAxisPosition(bBox.y, 1),
                    endXValue: chart.xAxis[0].getAxisPosition(bBox.x + bBox.width, 1),
                    endYValue: chart.yAxis[0].getAxisPosition(bBox.y + bBox.height, 1),
                    data: chart.logic.getCollatedData(),
                    id: selectEleObj.id
                };

                for (items in selectEleObj) {
                    selectEleItem = selectEleObj[items];
                    selectEleItem.remove && selectEleItem.remove();
                    delete selectEleObj[items];
                }
                delete selectEleArr[index];
                /**
                 * This event is raised when ~
                 *
                 * @event FusionCharts#selectionRemoved
                 * @group chart-powercharts:selectscatter
                 *
                 * @param {object} data -
                 */
                global.raiseEvent('selectionRemoved', eventArgs, chart.logic.chartInstance);
            },

            bindDragEvent: function(selectEleObj) {
                var chart = this,
                    //logic = chart.logic,
                    item;
                for (item in selectEleObj) {
                    /Tracker/.test(item) && selectEleObj[item].drag(chart.move,
                        chart.start, chart.up);
                }
            },

            start: function() {
                var ele = this,
                    data = ele.data('config'),
                    selectEleObj = data.selectEleObj,

                    topT = selectEleObj.topTracker,
                    rightT = selectEleObj.rightTracker,
                    bottomT = selectEleObj.bottomTracker,
                    leftT = selectEleObj.leftTracker,
                    resizeT = selectEleObj.resizeTracker,

                    topTData = topT.data('config'),
                    rightTData = rightT.data('config'),
                    bottomTData = bottomT.data('config'),
                    leftTData = leftT.data('config'),
                    resizeTData = resizeT.data('config'),
                    selectTData = selectEleObj.selectBoxTracker.data('config'),
                    bBox = selectEleObj.selectBoxTracker.getBBox();

                topTData.ox = bBox.x;
                topTData.oy = bBox.y;

                rightTData.ox = bBox.x2;
                rightTData.oy = bBox.y;

                bottomTData.ox = bBox.x;
                bottomTData.oy = bBox.y2;

                leftTData.ox = bBox.x;
                leftTData.oy = bBox.y;

                topTData.ox = bBox.x;
                topTData.oy = bBox.y;

                resizeTData.ox = bBox.x2;
                resizeTData.oy = bBox.y2;

                selectTData.ox = bBox.x;
                selectTData.oy = bBox.y;
                selectTData.ow = bBox.width;
                selectTData.oh = bBox.height;
                selectTData.ox2 = bBox.x2;
                selectTData.oy2 = bBox.y2;
                // on click take the selection box on top.
                selectEleObj.selectBoxG.toFront();

                topT.hide();
                rightT.hide();
                bottomT.hide();
                leftT.hide();
                resizeT.hide();
                ele.show();
            },

            move: function(dx, dy) {
                var ele = this,
                    data = ele.data('config'),
                    selectEleObj = data.selectEleObj,
                    chart = selectEleObj.chart,
                    topT = selectEleObj.topTracker,
                    rightT = selectEleObj.rightTracker,
                    bottomT = selectEleObj.bottomTracker,
                    leftT = selectEleObj.leftTracker,
                    resizeT = selectEleObj.resizeTracker,
                    selectT = selectEleObj.selectBoxTracker,
                    canvasLeft = selectEleObj.canvasLeft,
                    canvasRight = selectEleObj.canvasRight,
                    canvasTop = selectEleObj.canvasTop,
                    canvasBottom = selectEleObj.canvasBottom,
                    HALF_T_WID = -6,
                    selectTData = selectT.data('config'),
                    attrib = {},
                    bBox,
                    eventArgs,
                    x,
                    y;

                dx = data.xChange ? dx : 0;
                dy = data.yChange ? dy : 0;

                x = dx + data.ox;
                y = dy + data.oy;

                x = mathMin(canvasRight - (data.ow || 0), mathMax(x, canvasLeft));
                y = mathMin(canvasBottom - (data.oh || 0), mathMax(y, canvasTop));


                switch (data.position) {
                case 1: // TOP
                    attrib.y = mathMin(selectTData.oy2, y);
                    attrib.height = mathAbs(selectTData.oy2 - y) || 1;
                    topT.attr({
                        y: y + HALF_T_WID
                    });
                    break;
                case 2: // Right
                    attrib.x = mathMin(selectTData.ox, x);
                    attrib.width = mathAbs(selectTData.ox - x) || 1;
                    rightT.attr({
                        x: x + HALF_T_WID
                    });
                    break;
                case 3: // Bottom
                    attrib.y = mathMin(selectTData.oy, y);
                    attrib.height = mathAbs(selectTData.oy - y) || 1;
                    bottomT.attr({
                        y: y + HALF_T_WID
                    });
                    break;
                case 4: // Left
                    attrib.x = mathMin(selectTData.ox2, x);
                    attrib.width = mathAbs(selectTData.ox2 - x) || 1;
                    leftT.attr({
                        x: x + HALF_T_WID
                    });
                    break;
                case 5: // Corner
                    attrib.x = mathMin(selectTData.ox, x);
                    attrib.width = mathAbs(selectTData.ox - x) || 1;
                    attrib.y = mathMin(selectTData.oy, y);
                    attrib.height = mathAbs(selectTData.oy - y) || 1;
                    resizeT.attr({
                        cx: x,
                        cy: y
                    });
                    break;
                default:
                    attrib.x = x;
                    attrib.y = y;
                    break;
                }

                if (!ele.data('dragStarted')) {
                    bBox = selectT.getBBox();

                    eventArgs = {
                        selectionLeft: bBox.x,
                        selectionTop: bBox.y,
                        selectionWidth: bBox.width,
                        selectionHeight: bBox.height,
                        startXValue: chart.xAxis[0].getAxisPosition(bBox.x, 1),
                        startYValue: chart.yAxis[0].getAxisPosition(bBox.y, 1),
                        endXValue: chart.xAxis[0].getAxisPosition(bBox.x + bBox.width, 1),
                        endYValue: chart.yAxis[0].getAxisPosition(bBox.y + bBox.height, 1),
                        id: selectEleObj.id
                    };

                    global.raiseEvent('BeforeSelectionUpdate', eventArgs, chart.logic.chartInstance);
                    ele.data('dragStarted', 1);
                }

                selectT.animate(attrib);

                if (selectEleObj.isVisible) {
                    selectEleObj.closeButton.hide();
                    selectEleObj.cornerInnerSymbol.hide();
                    selectEleObj.cornerOuterSymbol.hide();
                    selectEleObj.isVisible = false;
                }
            },

            up: function() {
                var ele = this,
                    data = ele.data('config'),
                    selectEleObj = data.selectEleObj,
                    chart = selectEleObj.chart,
                    xAxis = chart.xAxis && chart.xAxis[0],
                    yAxis = chart.yAxis && chart.yAxis[0],
                    topT = selectEleObj.topTracker,
                    rightT = selectEleObj.rightTracker,
                    bottomT = selectEleObj.bottomTracker,
                    leftT = selectEleObj.leftTracker,
                    resizeT = selectEleObj.resizeTracker,
                    selectT = selectEleObj.selectBoxTracker,
                    RESIZE_T_RADIUS = 15,
                    HALF_T_WID = -6,
                    bBox,
                    eventArgs;

                // using setTimeout to fix for the issue #RED-476.
                setTimeout(function() {
                    bBox = selectT.getBBox(),

                    selectEleObj.startX = xAxis.getAxisPosition(bBox.x, 1);
                    selectEleObj.startY = yAxis.getAxisPosition(bBox.y, 1);
                    selectEleObj.endX = xAxis.getAxisPosition(bBox.x2, 1);
                    selectEleObj.endY = yAxis.getAxisPosition(bBox.y2, 1);

                    topT.attr({
                        x: bBox.x,
                        y: bBox.y + HALF_T_WID,
                        width: bBox.width
                    });
                    rightT.attr({
                        x: bBox.x2 + HALF_T_WID,
                        y: bBox.y,
                        height: bBox.height
                    });
                    bottomT.attr({
                        x: bBox.x,
                        y: bBox.y2 + HALF_T_WID,
                        width: bBox.width
                    });
                    leftT.attr({
                        x: bBox.x + HALF_T_WID,
                        y: bBox.y,
                        height: bBox.height
                    });
                    resizeT.attr({
                        cx: bBox.x2,
                        cy: bBox.y2
                    });

                    selectEleObj.closeButton.transform(t + bBox.x2 + COMMA + bBox.y);
                    selectEleObj.cornerInnerSymbol.transform(t + bBox.x2 + COMMA + bBox.y2);
                    selectEleObj.cornerOuterSymbol.transform(t + bBox.x2 + COMMA + bBox.y2);
                    selectEleObj.closeButton.show();
                    if (bBox.width < RESIZE_T_RADIUS || bBox.height < RESIZE_T_RADIUS) {
                        selectEleObj.cornerInnerSymbol.hide();
                        selectEleObj.cornerOuterSymbol.show();
                    } else {
                        selectEleObj.cornerInnerSymbol.show();
                        selectEleObj.cornerOuterSymbol.hide();
                    }
                    selectEleObj.isVisible = true;

                    topT.show();
                    rightT.show();
                    bottomT.show();
                    leftT.show();
                    resizeT.show();

                    if (ele.data('dragStarted')) {
                        eventArgs = {
                            selectionLeft: bBox.x,
                            selectionTop: bBox.y,
                            selectionWidth: bBox.width,
                            selectionHeight: bBox.height,
                            startXValue: chart.xAxis[0].getAxisPosition(bBox.x, 1),
                            startYValue: chart.yAxis[0].getAxisPosition(bBox.y, 1),
                            endXValue: chart.xAxis[0].getAxisPosition(bBox.x + bBox.width, 1),
                            endYValue: chart.yAxis[0].getAxisPosition(bBox.y + bBox.height, 1),
                            data: chart.logic.getCollatedData(),
                            id: selectEleObj.id
                        };
                        global.raiseEvent('SelectionUpdated', eventArgs, chart.logic.chartInstance);
                        ele.data('dragStarted', 0);
                    }

                }, 100);
            },

            postSeriesAddition: function(hc, fc) {
                var iapi = this,
                    ret = chartAPI.scatter && chartAPI.scatter.postSeriesAddition &&
                        chartAPI.scatter.postSeriesAddition.apply(iapi, arguments),
                    HCChartObj = hc.chart,
                    FCChartObj = fc.chart,
                    colorM = this.colorManager,
                    borderColor = pluck(FCChartObj.selectbordercolor,
                        colorM.getColor('canvasBorderColor')),
                    borderAlpha = pluckNumber(FCChartObj.selectborderalpha,
                        colorM.getColor('canvasBorderAlpha'));

                HCChartObj.selectBorderColor = //convertColor(borderColor, borderAlpha);
                {
                    FCcolor: {
                        color: borderColor,
                        alpha: borderAlpha
                    }
                };
                HCChartObj.selectFillColor = convertColor(
                    pluck(FCChartObj.selectfillcolor,
                        colorM.getColor('altHGridColor')),
                    pluckNumber(FCChartObj.selectfillalpha,
                        colorM.getColor('altHGridAlpha')));

                HCChartObj.selectionCancelButtonBorderColor = convertColor(pluck(
                        FCChartObj.selectioncancelbuttonbordercolor, borderColor),
                    pluckNumber(FCChartObj.selectioncancelbuttonborderalpha, borderAlpha));
                HCChartObj.selectionCancelButtonFillColor = convertColor(pluck(
                        FCChartObj.selectioncancelbuttonfillcolor, 'FFFFFF'),
                    pluckNumber(FCChartObj.selectioncancelbuttonfillalpha, 100));

                hc.chart.nativeZoom = false;

                HCChartObj.formAction = getValidValue(FCChartObj.formaction);

                if (FCChartObj.submitdataasxml === '0' && !FCChartObj.formdataformat) {
                    FCChartObj.formdataformat = global.dataFormats.CSV;
                }

                HCChartObj.formDataFormat = pluck(FCChartObj.formdataformat,
                    global.dataFormats.XML);
                HCChartObj.formTarget = pluck(FCChartObj.formtarget, '_self');
                HCChartObj.formMethod = pluck(FCChartObj.formmethod, 'POST');
                HCChartObj.submitFormAsAjax = pluckNumber(FCChartObj.submitformusingajax, 1);


                (hc.callbacks || (hc.callbacks = [])).push(function() {
                    var chart = this,
                        chartLogic = chart.logic;

                    bindSelectionEvent(chart, {
                        selectionStart: function(data) {
                            var pos = getMouseCoordinate(data.chart.container, data.originalEvent),
                                eventArgs = extend2({
                                    selectionLeft: data.selectionLeft,
                                    selectionTop: data.selectionTop,
                                    selectionWidth: data.selectionWidth,
                                    selectionHeight: data.selectionHeight,
                                    startXValue: data.chart.xAxis[0].getAxisPosition(data.selectionLeft, 1),
                                    startYValue: data.chart.yAxis[0].getAxisPosition(data.selectionTop, 1)
                                }, pos);

                            /**
                             * Raised when user starts to draw a selection box on a `selectScatter` chart.
                             * @event FusionCharts#selectionStart
                             *
                             * @param {number} chartX - The x-coordinate of the mouse with respect to the chart.
                             * @param {number} chartY - The y-coordinate of the mouse with respect to the chart.
                             * @param {number} pageX - The x-coordinate of the mouse with respect to the page.
                             * @param {number} pageY - The y-coordinate of the mouse with respect to the page.
                             * @param {number} startXValue - The value on the canvas x-axis where the selection started.
                             * @param {number} startYValue - The value on the canvas y-axis where the selection started.
                             */
                            global.raiseEvent('selectionStart', eventArgs, data.chart.logic.chartInstance);
                        },
                        selectionEnd: function(data) {
                            var pos = getMouseCoordinate(data.chart.container, data.originalEvent),
                                xAxis = data.chart.xAxis[0],
                                yAxis = data.chart.yAxis[0],
                                eventArgs = extend2({
                                    selectionLeft: data.selectionLeft,
                                    selectionTop: data.selectionTop,
                                    selectionWidth: data.selectionWidth,
                                    selectionHeight: data.selectionHeight,
                                    startXValue: xAxis.getAxisPosition(data.selectionLeft, 1),
                                    startYValue: yAxis.getAxisPosition(data.selectionTop, 1),
                                    endXValue: xAxis.getAxisPosition(data.selectionLeft + data.selectionWidth, 1),
                                    endYValue: yAxis.getAxisPosition(data.selectionTop + data.selectionHeight, 1)
                                }, pos);

                            /**
                             * Raised when user completes a selection box on a `selectScatter` chart.
                             * @event FusionCharts#selectionEnd
                             *
                             * @param {number} chartX - The x-coordinate of the mouse with respect to the chart.
                             * @param {number} chartY - The y-coordinate of the mouse with respect to the chart.
                             * @param {number} pageX - The x-coordinate of the mouse with respect to the page.
                             * @param {number} pageY - The y-coordinate of the mouse with respect to the page.
                             * @param {number} startXValue - The value on the canvas x-axis where the selection started.
                             * @param {number} startYValue - The value on the canvas y-axis where the selection started.
                             * @param {number} endXValue - The value on the canvas x-axis where the selection ended.
                             * @param {number} endYValue - The value on the canvas y-axis where the selection ended.
                             * @param {number} selectionLeft - The x-coordinate from where selection started with
                             * respect to the chart.
                             * @param {number} selectionTop - The y-coordinate from where selection started with
                             * respect to the chart.
                             * @param {number} selectionWidth - The width of the selection in pixels.
                             * @param {number} selectionHeight - The height of the selection box in pixels.
                             */
                            global.raiseEvent('selectionEnd', eventArgs, data.chart.logic.chartInstance);
                            chartLogic.createSelectionBox(data);
                        }
                    });
                });

                hc.chart.zoomType = 'xy';
                return ret;
            }

        }, chartAPI.scatterbase);


        /*
         * helper function to retrive original attributes of a axis JSON
         * this function will remove all property name start with '_'
         * will also remove propery like dataset
         */

        function retrieveAxisAttr(AxisJSON, store) {
            var key;
            if (!store._origAttr) {
                store._origAttr = {};
            }
            for (key in AxisJSON) {
                if (!keyTestReg.test(key)) {
                    store._origAttr[key] = AxisJSON[key];
                }
            }
            return store._origAttr;
        }

        chartAPI('multiaxisline', {
            friendlyName: 'Multi-axis Line Chart',
            standaloneInit: true,
            creditLabel: creditLabel,
            defaultSeriesType: 'line',
            rendererId: 'multiaxisline',
            isMLAxis: true,
            canvasPaddingModifiers: ['anchor', 'anchorlabel'],
            drawAxisTrackerAndCheckBox: function() {
                var chart = this,
                    plotLeft = chart.canvasLeft, //chart.plotLeft,
                    plotTop = chart.canvasTop, //chart.plotTop,
                    plotWidth = chart.canvasWidth, //chart.plotWidth,
                    plotHeight = chart.canvasHeight, //chart.plotHeight,
                    paper = chart.paper,
                    yAxis = chart.yAxis,
                    len = yAxis.length,
                    iapi = chart.logic,
                    leftAxisCount = 0,
                    rightAxisCount = 0,
                    css = {
                        cursor: 'col-resize',
                        '_cursor': 'e-resize',
                        '*cursor': 'e-resize'
                    },
                    chartObj = iapi.chartInstance,
                    vars = chartObj.jsVars,
                    dataObj = iapi.dataObj,
                    reflowData = vars._reflowData,
                    reflowJSON = reflowData.hcJSON || {},
                    origAxis = dataObj.axis,
                    FCChartObj = dataObj.chart,
                    allowAxisShift = pluckNumber(FCChartObj.allowaxisshift, 1),
                    allowSelection = pluckNumber(FCChartObj.allowselection, 1),
                    ui = allowSelection && paper.html('div', {
                        fill: 'transparent',
                        width: chart.chartWidth,
                        height: 20
                    }, {
                        top: '',
                        left: '',
                        fontSize: 10 + PX,
                        lineHeight: 15 + PX,
                        marginTop: -chart.chartHeight + PX
                    }, chart.container),
                    reflowYAxis = reflowJSON.yAxis || (reflowJSON.yAxis = []),
                    yAxisObj,
                    yAxisData,
                    axisWidth,
                    isOpp,
                    checkBoxXPos,
                    checkBoxYPos,
                    setSeriesVisibility = function(index) {
                        chart.series && chart.series[index] &&
                            chart.series[index].setVisible(false, false);
                    },
                    axisBoxMouseDnFN = function(e) {
                        var config = e.data,
                            axisData = config.axis[config.index].axisData,
                            relatedSeries = axisData._relatedSeries,
                            chkVal = !config.checkBox.checked(),
                            origAxisData = origAxis[axisData._axisposition];

                        // Hiding related series at checkbox click
                        relatedSeries && each(relatedSeries, function(index) {
                            //chart.options.series[index].setVisible(chkVal, false);
                            //instead of calling the series.setVisible method call
                            //corresponding legendClick method, this will keep
                            //legend in sync as well.
                            //The second parameter will stop invoking legend click
                            //event.
                            chart.options.series[index].legendClick(chkVal, true);
                        });

                        // stroing checkbox clicked on original FC data for
                        // state management
                        origAxisData.hidedataplots = !chkVal;
                        extend2(reflowData, {
                            preReflowAdjustments: function() {
                                this.dataObj.axis = origAxis;
                            }
                        });
                        //raise event AxisSelected
                        global.raiseEvent(AXISSELECTED, {
                            selected: chkVal,
                            AxisId: origAxisData._index,
                            AxisConfiguration: axisData._origAttr || retrieveAxisAttr(origAxisData, axisData)
                        }, chart.logic.chartInstance);

                    },
                    axisMouseDown = function(e) {
                        var config = e.data,
                            yAxis = config.axis,
                            index = config.index,
                            axisObj = yAxis[index],
                            axisData = axisObj.axisData,
                            isOpp = axisData.opposite,
                            clickedAxisIndex = axisData._axisposition,
                            ln = origAxis.length,
                            i,
                            FCAxisJSON,
                            fcOpp,
                            swapedIndex,
                            temp,
                            oldAxisData = {},
                            origAxisData = origAxis[clickedAxisIndex],
                            oldOrigAxisData = {};



                        for (i = 0; i < ln; i += 1) {
                            FCAxisJSON = origAxis[i];
                            fcOpp = !pluckNumber(FCAxisJSON.axisonleft, 1);
                            if (fcOpp === isOpp) {
                                swapedIndex = i;
                                //break the loop
                                if (isOpp) {
                                    i = ln;
                                }
                            }
                        }
                        if (swapedIndex !== clickedAxisIndex) {
                            oldAxisData = yAxis[swapedIndex];
                            oldOrigAxisData = origAxis[swapedIndex];
                            temp = origAxis.splice(swapedIndex, 1,
                                origAxis[clickedAxisIndex]);
                            origAxis.splice(clickedAxisIndex, 1, temp[0]);
                        }
                        if (swapedIndex !== clickedAxisIndex ||
                            isOpp !== iapi.dataObj.chart._lastClickedOpp) {
                            extend2(reflowData, {
                                preReflowAdjustments: function() {
                                    var iapi = this;
                                    iapi.dataObj.chart._lastClickedOpp = isOpp;
                                    iapi.dataObj.axis = origAxis;
                                }
                            });

                            //raise event AxisSelected
                            global.raiseEvent(AXISSHIFTED, {
                                previousDefaultAxisId: oldOrigAxisData._index,
                                newDefaultAxisId: origAxisData._index,
                                previousDefaultAxisConfiguration: oldAxisData._origAttr || retrieveAxisAttr(
                                    oldOrigAxisData, oldAxisData),
                                newDefaultAxisConfiguration: axisData._origAttr || retrieveAxisAttr(
                                    origAxisData, axisData)
                            }, chart.logic.chartInstance);

                            global.hcLib.createChart(chartObj, vars.container, vars.type, undefined, undefined, false,
                                true);
                        }


                    };

                while (len--) {
                    yAxisObj = yAxis[len];
                    yAxisData = yAxisObj.axisData;
                    axisWidth = yAxisData._axisWidth;
                    isOpp = yAxisData.opposite;
                    if (!isOpp) {
                        leftAxisCount += axisWidth;
                    }

                    reflowYAxis[len] || (reflowYAxis[len] = {});

                    // checkBox drawing
                    if (allowSelection && yAxisData.showAxis) {

                        checkBoxXPos = plotLeft + (isOpp ? plotWidth + rightAxisCount +
                            pluckNumber(yAxisData.title.margin, axisWidth - 10) + 5 : -leftAxisCount);

                        checkBoxYPos = plotTop + plotHeight + 10;

                        yAxisObj.checkBox = paper.html('input', {}, {
                            left: checkBoxXPos + PX,
                            top: checkBoxYPos + PX
                        })
                            .attr({
                                type: 'checkbox'
                            })
                            .add(ui);

                        yAxisObj.checkBox.val(yAxisData.hidedataplots);

                        // Hiding related series at first rendering
                        if (!yAxisData.hidedataplots) {
                            yAxisData._relatedSeries && each(yAxisData._relatedSeries, setSeriesVisibility);
                        }

                        addEvent(yAxisObj.checkBox.element, hasTouch ? 'touchstart' :
                            'mousedown', axisBoxMouseDnFN, {
                                axis: yAxis,
                                index: len,
                                checkBox: yAxisObj.checkBox
                            });
                    }
                    // End of checkBox drawing

                    // Axis tracker drawing
                    if (allowAxisShift) {
                        yAxisObj.tracker = paper.rect(plotLeft +
                            (isOpp ? plotWidth + rightAxisCount : -leftAxisCount),
                            plotTop, axisWidth, plotHeight, 0)
                            .attr({
                                //stroke: TRACKER_FILL,
                                'stroke-width': 0,
                                fill: TRACKER_FILL,
                                isTracker: +new Date(),
                                zIndex: 7
                            })
                            .css(css);

                        if (isOpp) {
                            rightAxisCount += axisWidth;
                        }

                        addEvent(yAxisObj.tracker[0], hasTouch ? 'touchstart' :
                            'mousedown', axisMouseDown, {
                                axis: yAxis,
                                index: len
                            });
                    }
                }
            },

            series: function(FCObj) {
                var iapi = this,
                    NumberFormatter = iapi.numberFormatter,
                    chartName = iapi.name,
                    dataObj = iapi.dataObj,
                    chartAttrs = dataObj.chart,
                    axisAttrs = dataObj.axis,
                    HCObj = iapi.hcJSON,
                    conf = HCObj[CONFIGKEY],
                    refAxis = HCObj.yAxis[0],
                    allowSelection = pluckNumber(dataObj.chart.allowselection, 1),
                    positionedAxisArr = [],
                    showAxisNameInLegend = pluckNumber(chartAttrs.showaxisnamesinlegend, 0),
                    yaxisvaluesstep = pluckNumber(chartAttrs.yaxisvaluesstep,
                        chartAttrs.yaxisvaluestep, 1),
                    colorM = this.colorManager,
                    plotColor,
                    series,
                    seriesArr,
                    dataset,
                    axisOriIndex,
                    hasVisibleSeries,
                    includeInLegend,
                    showAxis,
                    axisIndex,
                    axisSeries,
                    relatedSeries,
                    l,
                    axisJson,
                    axisColor,
                    isOpp,
                    datasetIndex,
                    datasetLen,
                    yAxisConf,
                    axisHEXColor,
                    gridLineWidth,
                    nearestLeftAxisIndex,
                    nearestRightAxisIndex,
                    visGridAxisIndex,
                    tickWidth,
                    axisLineThickness;

                if (!HCObj.callbacks) {
                    HCObj.callbacks = [];
                }

                HCObj.callbacks.push(function() {
                    iapi.drawAxisTrackerAndCheckBox.call(this);
                });

                //enable the legend
                HCObj.legend.enabled = Boolean(pluckNumber(dataObj.chart.showlegend, 1));

                if (axisAttrs && axisAttrs.length > 0) {
                    this.categoryAdder(dataObj, HCObj);
                    HCObj.yAxis.splice(0, 2);
                    conf.noHiddenAxis = 0;

                    // In case the axes have been re-shuffled, they will have the property
                    // axisPosition, according to which they need to be placed in the chart.
                    // Sorting on axisPosition will put them in the correct order to
                    // be rendered.
                    for (axisIndex = 0, l = axisAttrs.length; axisIndex < l; axisIndex += 1) {
                        axisJson = axisAttrs[axisIndex];
                        //for first time
                        if (axisJson._index === undefined) {
                            axisJson._index = axisIndex;
                        }
                        axisJson._axisposition = axisIndex;
                        isOpp = !pluckNumber(axisJson.axisonleft, 1);
                        if (isOpp) {
                            axisJson._isSY = true;
                            positionedAxisArr.unshift(axisJson);
                        } else {
                            axisJson._isSY = false;
                            positionedAxisArr.push(axisJson);
                        }
                    }

                    for (axisIndex = 0, l = positionedAxisArr.length; axisIndex < l; axisIndex += 1) {
                        axisJson = positionedAxisArr[axisIndex];
                        showAxis = pluckNumber(axisJson.showaxis, 1);
                        axisOriIndex = axisJson._index || 0;
                        //create number formater fo this axis
                        NumberFormatter.parseMLAxisConf(axisJson, axisOriIndex);
                        plotColor = colorM.getPlotColor(axisOriIndex);

                        // Assigning id to the axis.
                        axisJson.id = axisOriIndex;

                        axisHEXColor = pluck(axisJson.color, chartAttrs.axiscolor,
                            plotColor);
                        axisColor = convertColor(axisHEXColor, 100);
                        isOpp = !pluckNumber(axisJson.axisonleft, 1);
                        gridLineWidth = pluckNumber(axisJson.divlinethickness,
                            chartAttrs.divlinethickness, 1);
                        tickWidth = showAxis ? pluckNumber(axisJson.tickwidth,
                            chartAttrs.axistickwidth, 2) : 0;
                        axisLineThickness = showAxis ?
                            pluckNumber(axisJson.axislinethickness,
                                chartAttrs.axislinethickness, 2) : 0;

                        //create conf obj
                        yAxisConf = conf[axisIndex] = {};
                        yAxisConf.showAxis = showAxis;
                        conf.noHiddenAxis += 1 - showAxis;

                        if (showAxis) {
                            if (isOpp) {
                                nearestRightAxisIndex = axisIndex;
                            } else {
                                nearestLeftAxisIndex = axisIndex;
                            }
                        }

                        relatedSeries = [];
                        HCObj.yAxis.push({
                            startOnTick: false,
                            endOnTick: false,
                            _axisposition: axisJson._axisposition,
                            _isSY: axisJson._isSY,
                            _index: axisOriIndex,
                            hidedataplots: !pluckNumber(axisJson.hidedataplots, 0),
                            title: {
                                enabled: showAxis,
                                style: refAxis.title.style,
                                text: showAxis ? parseUnsafeString(axisJson.title) : BLANK,
                                align: allowSelection ? 'low' : 'middle',
                                textAlign: allowSelection && isOpp ? 'right' : undefined
                            },
                            labels: {
                                x: 0,
                                style: refAxis.labels.style
                            },
                            plotBands: [],
                            plotLines: [],
                            gridLineColor: convertColor(pluck(axisJson.divlinecolor, axisHEXColor),
                                pluckNumber(axisJson.divlinealpha, chartAttrs.divlinealpha,
                                    colorM.getColor('divLineAlpha'), 100)),
                            gridLineWidth: gridLineWidth,
                            gridLineDashStyle: pluckNumber(axisJson.divlinedashed, axisJson.divlineisdashed,
                                chartAttrs.divlinedashed, chartAttrs.divlineisdashed, 0) ?
                                    getDashStyle(pluckNumber(axisJson.divlinedashlen,
                                    chartAttrs.divlinedashlen, 4), pluckNumber(axisJson.divlinedashgap,
                                    chartAttrs.divlinedashgap, 2), gridLineWidth) : undefined,
                            alternateGridColor: COLOR_TRANSPARENT,
                            //offset: (isOpp ? hc.chart.margin[1] : hc.chart.margin[3]) + 3,
                            //set the offset during space management
                            lineColor: axisColor,
                            lineWidth: axisLineThickness,
                            tickLength: tickWidth,
                            tickColor: axisColor,
                            tickWidth: axisLineThickness,
                            //set the axis position as per xml conf.
                            opposite: isOpp,
                            _relatedSeries: relatedSeries,
                            showAxis: showAxis
                        });

                        //add axis configuration
                        yAxisConf.yAxisValuesStep = pluckNumber(axisJson.yaxisvaluesstep, axisJson.yaxisvaluestep,
                            yaxisvaluesstep);
                        yAxisConf.maxValue = axisJson.maxvalue;
                        yAxisConf.tickWidth = tickWidth;
                        yAxisConf.minValue = axisJson.minvalue;
                        yAxisConf.setadaptiveymin = pluckNumber(axisJson.setadaptiveymin, chartAttrs.setadaptiveymin);
                        yAxisConf.numDivLines = pluckNumber(axisJson.numdivlines, chartAttrs.numdivlines, 4);
                        yAxisConf.adjustdiv = pluckNumber(axisJson.adjustdiv, chartAttrs.adjustdiv);
                        yAxisConf.showYAxisValues = showAxis ? pluckNumber(axisJson.showyaxisvalues,
                            axisJson.showyaxisvalue, chartAttrs.showyaxisvalues, chartAttrs.showyaxisvalue, 1) : 0;
                        yAxisConf.showLimits = showAxis ? pluckNumber(axisJson.showlimits, chartAttrs.showyaxislimits,
                            chartAttrs.showlimits, yAxisConf.showYAxisValues) : 0;
                        yAxisConf.showDivLineValues = showAxis ? pluckNumber(axisJson.showdivlinevalue,
                            chartAttrs.showdivlinevalues, axisJson.showdivlinevalues,
                            yAxisConf.showYAxisValues) : 0;
                        yAxisConf.showzeroplane = axisJson.showzeroplane;
                        yAxisConf.showzeroplanevalue = pluckNumber(axisJson.showzeroplanevalue);
                        yAxisConf.zeroplanecolor = axisJson.zeroplanecolor;
                        yAxisConf.zeroplanethickness = axisJson.zeroplanethickness;
                        yAxisConf.zeroplanealpha = axisJson.zeroplanealpha;

                        yAxisConf.linecolor = pluck(axisJson.linecolor,
                            chartAttrs.linecolor || axisJson.color, plotColor);
                        yAxisConf.linealpha = axisJson.linealpha;
                        yAxisConf.linedashed = axisJson.linedashed;
                        yAxisConf.linethickness = axisJson.linethickness;
                        yAxisConf.linedashlen = axisJson.linedashlen;
                        yAxisConf.linedashgap = axisJson.linedashgap;
                        yAxisConf.anchorShadow = axisJson.anchorshadow;
                        yAxisConf.plottooltext = axisJson.plottooltext;

                        //put all series now
                        if (axisJson.dataset && axisJson.dataset.length > 0) {
                            datasetLen = axisJson.dataset.length;
                            // Whether to include in series or not
                            includeInLegend = pluckNumber(axisJson.includeinlegend, 1);
                            hasVisibleSeries = false;
                            axisSeries = {
                                data: [],
                                relatedSeries: relatedSeries,
                                name: parseUnsafeString(axisJson.title),
                                type: 'line',
                                marker: {
                                    symbol: 'axisIcon',
                                    fillColor: TRACKER_FILL,
                                    lineColor: getDarkColor(axisHEXColor, 80).replace(dropHash, HASHSTRING)
                                },
                                lineWidth: 0,
                                legendFillColor: showAxisNameInLegend !== 0 ?
                                    convertColor(axisHEXColor, 25) : undefined,
                                legendFillOpacity: 0,
                                legendIndex: axisJson._index,
                                showInLegend: Boolean(pluckNumber(showAxisNameInLegend, includeInLegend))
                            };
                            HCObj.series.push(axisSeries);

                            for (datasetIndex = 0; datasetIndex < datasetLen; datasetIndex += 1) {
                                dataset = axisJson.dataset[datasetIndex];
                                // store parent yAxis name for future reference
                                dataset._yAxisName = axisJson.title;
                                if (dataset.color === undefined) {
                                    dataset.color = pluck(yAxisConf.linecolor, axisHEXColor);
                                }
                                series = {
                                    visible: !pluckNumber(dataset.initiallyhidden, 0),
                                    yAxis: axisIndex,
                                    data: [],
                                    hoverEffects: this.parseSeriesHoverOptions(FCObj, HCObj, dataset, chartName)
                                };
                                //add data to the series
                                seriesArr = this.point(chartName, series,
                                    dataset, dataObj.chart, HCObj, conf.oriCatTmp.length,
                                    axisIndex, axisOriIndex);
                                seriesArr.legendFillColor = axisSeries.legendFillColor;
                                seriesArr.legendIndex = axisJson._index;
                                if (seriesArr.showInLegend === undefined || seriesArr.showInLegend) {
                                    hasVisibleSeries = true;
                                }
                                if (seriesArr.showInLegend !== false) {
                                    seriesArr.showInLegend = Boolean(includeInLegend);
                                }
                                relatedSeries.push(HCObj.series.length);
                                HCObj.series.push(seriesArr);
                            }

                            if (relatedSeries.length === 0 || !hasVisibleSeries) {
                                axisSeries.showInLegend = false;
                            }
                        }
                    }

                    visGridAxisIndex = chartAttrs._lastClickedOpp ?
                        pluckNumber(nearestRightAxisIndex, nearestLeftAxisIndex) :
                        pluckNumber(nearestLeftAxisIndex, nearestRightAxisIndex);

                    for (axisIndex = 0, l = HCObj.yAxis.length; axisIndex < l; axisIndex += 1) {
                        if (axisIndex != visGridAxisIndex) {
                            HCObj.yAxis[axisIndex].gridLineWidth = 0;
                            conf[axisIndex].zeroplanethickness = 0;
                        }
                    }

                    ///configure the axis
                    this.configureAxis(HCObj, dataObj);
                }
            },


            point: function(chartName, series, dataset, FCChartObj, HCObj, catLength, seriesIndex, axisOriIndex) {
                var hasValidPoint = false,
                    ignoreEmptyDatasets = pluckNumber(FCChartObj.ignoreemptydatasets, 0),
                    itemValue,
                    index,
                    dataParser,
                    dataObj,
                    HCChartObj = HCObj.chart,
                    // Data array in dataset object
                    data = dataset.data || [],
                    conf = HCObj[CONFIGKEY],
                    yAxisIndex = series.yAxis || 0,
                    yAxisConf = conf[yAxisIndex],
                    // take the series type
                    seriesType = pluck(series.type, this.defaultSeriesType),
                    // Check the chart is a stacked chart or not
                    isStacked = HCObj.plotOptions[seriesType] && HCObj.plotOptions[seriesType].stacking,
                    // 100% stacked chart takes absolute values only
                    isValueAbs = pluck(this.isValueAbs, conf.isValueAbs, false),
                    seriesYAxis = pluckNumber(series.yAxis, 0),
                    NumberFormatter = this.numberFormatter,
                    colorM = this.colorManager,

                    // Line cosmetics attributes
                    // Color of the line series
                    lineColorDef = getFirstColor(pluck(dataset.color, yAxisConf.linecolor, FCChartObj.linecolor,
                        colorM.getPlotColor())),
                    // Alpha of the line
                    lineAlphaDef = pluckNumber(dataset.alpha, yAxisConf.linealpha, FCChartObj.linealpha, HUNDREDSTRING),
                    showShadow = pluckNumber(FCChartObj.showshadow, this.defaultPlotShadow, 1),

                    // Managing line series markers
                    // Whether to drow the Anchor or not
                    drawAnchors = pluckNumber(dataset.drawanchors, dataset.showanchors, FCChartObj.drawanchors,
                        FCChartObj.showanchors),
                    // Anchor cosmetics
                    // We first look into dataset then chart obj and then default value.
                    setAnchorSidesDef = pluckNumber(dataset.anchorsides,
                        FCChartObj.anchorsides, 0),
                    setAnchorAngleDef = pluckNumber(dataset.anchorstartangle,
                        FCChartObj.anchorstartangle, 90),
                    setAnchorRadiusDef = pluckNumber(dataset.anchorradius,
                        FCChartObj.anchorradius, 3),
                    setAnchorBorderColorDef = getFirstColor(pluck(dataset.anchorbordercolor,
                        FCChartObj.anchorbordercolor, lineColorDef)),
                    setAnchorBorderThicknessDef = pluckNumber(dataset.anchorborderthickness,
                        FCChartObj.anchorborderthickness, 1),
                    setAnchorBgColorDef = getFirstColor(pluck(dataset.anchorbgcolor,
                        FCChartObj.anchorbgcolor, colorM.getColor('anchorBgColor'))),
                    setAnchorAlphaDef = pluck(dataset.anchoralpha, FCChartObj.anchoralpha,
                        HUNDREDSTRING),
                    setAnchorBgAlphaDef = pluck(dataset.anchorbgalpha, FCChartObj.anchorbgalpha,
                        setAnchorAlphaDef);

                // anchor shadow
                series.anchorShadow = setAnchorAlphaDef &&
                    pluck(dataset.anchorshadow, yAxisConf.anchorShadow,
                        FCChartObj.anchorshadow, 0);

                // Dataset seriesname
                series.name = getValidValue(dataset.seriesname);
                // If includeInLegend set to false
                // We set series.name blank
                if (pluckNumber(dataset.includeinlegend) === 0 ||
                    series.name === undefined || (lineAlphaDef === 0 &&
                        drawAnchors !== 1)) {
                    series.showInLegend = false;
                }

                //set the marker attr at series
                series.marker = {
                    fillColor: {
                        FCcolor: {
                            color: setAnchorBgColorDef,
                            alpha: ((setAnchorBgAlphaDef * setAnchorAlphaDef) / 100) + BLANK
                        }
                    },
                    lineColor: {
                        FCcolor: {
                            color: setAnchorBorderColorDef,
                            alpha: setAnchorAlphaDef + BLANK
                        }
                    },
                    lineWidth: setAnchorBorderThicknessDef,
                    radius: setAnchorRadiusDef,
                    symbol: mapSymbolName(setAnchorSidesDef),
                    startAngle: setAnchorAngleDef
                };

                // Set the line color and alpha to
                // HC seris obj with FusionCharts color format using FCcolor obj
                series.color = {
                    FCcolor: {
                        color: lineColorDef,
                        alpha: lineAlphaDef
                    }
                };
                // For Spline Chart shadow do not works at point label.
                series.shadow = showShadow ? {
                    opacity: showShadow ? lineAlphaDef / 100 : 0
                } : false;

                // IF its a step line chart
                series.step = this.stepLine;
                // Special attribute for StepLine (drawVerticalJoins)
                series.drawVerticalJoins = Boolean(pluckNumber(FCChartObj.drawverticaljoins, 1));
                series.useForwardSteps = Boolean(pluckNumber(FCChartObj.useforwardsteps, 1));

                // Set the line thickness (line width)
                series.lineWidth = pluckNumber(dataset.linethickness, yAxisConf.linethickness, FCChartObj.linethickness,
                    2);


                dataParser = series._dataParser = getDataParser.line(HCObj, {
                    //add axis level plotTooltipMacro attribute in dataset so that it works in default flow
                    plottooltext: pluck(dataset.plottooltext, yAxisConf.plottooltext),
                    seriesname: series.name,
                    lineAlpha: lineAlphaDef,
                    anchorAlpha: setAnchorAlphaDef,
                    showValues: pluckNumber(dataset.showvalues, conf.showValues),
                    yAxis: axisOriIndex,
                    lineDashed: Boolean(pluckNumber(dataset.dashed, yAxisConf.linedashed, FCChartObj.linedashed, 0)),
                    lineDashLen: pluckNumber(dataset.linedashlen, yAxisConf.linedashlen, FCChartObj.linedashlen, 5),
                    lineDashGap: pluckNumber(dataset.linedashgap, yAxisConf.linedashgap, FCChartObj.linedashgap, 4),
                    lineThickness: series.lineWidth,
                    lineColor: lineColorDef,
                    valuePosition: pluck(dataset.valueposition, HCChartObj.valuePosition),
                    drawAnchors: drawAnchors,
                    anchorShadow: series.anchorShadow,
                    anchorBgColor: setAnchorBgColorDef,
                    anchorBgAlpha: setAnchorBgAlphaDef,
                    anchorBorderColor: setAnchorBorderColorDef,
                    anchorBorderThickness: setAnchorBorderThicknessDef,
                    anchorRadius: setAnchorRadiusDef,
                    anchorSides: setAnchorSidesDef,
                    anchorAngle: setAnchorAngleDef,
                    // also sending FusionCharts dataset to pick new attributes if
                    // needed in any new chart type.
                    _sourceDataset: dataset,
                    _yAxisName : dataset._yAxisName,
                    hoverEffects: series.hoverEffects
                }, this);

                // clean dataset object
                delete dataset._yAxisName;

                // Iterate through all level data
                for (index = 0; index < catLength; index += 1) {
                    // Individual data obj
                    // for further manipulation
                    dataObj = data[index];
                    if (dataObj) {
                        itemValue = NumberFormatter.getCleanValue(dataObj.value, isValueAbs);
                        if (itemValue === null) {
                            // add the data
                            series.data.push({
                                y: null
                            });
                            continue;
                        }
                        //set the flag
                        hasValidPoint = true;

                        //push the point object
                        series.data.push(dataParser(dataObj, index, itemValue));

                        // Set the maximum and minimum found in data
                        // pointValueWatcher use to calculate the maximum and minimum value of the Axis
                        this.pointValueWatcher(HCObj, itemValue, seriesYAxis,
                            isStacked, index, 0, seriesType);
                    } else {
                        // add the data
                        series.data.push({
                            y: null
                        });
                    }
                }

                if (ignoreEmptyDatasets && !hasValidPoint && !this.realtimeEnabled) {
                    series.showInLegend = false;
                }

                //return series
                return series;
            },

            configureAxis: function(HCObj, FCObj) {
                var conf = HCObj[CONFIGKEY],
                    xAxisObj = HCObj.xAxis,
                    FCchartObj = FCObj.chart,
                    yAxisObj, len, yAxisConf, yAxisMaxValue, yAxisMinValue, stopMaxAtZero,
                    setMinAsZero, setadaptiveymin,
                    numDivLines, adjustDiv, showLimits, showDivLineValues,
                    yaxisvaluesstep, y;

                /**
                 * configure x axis
                 */

                //add xaxisTitle
                xAxisObj.title.text = parseUnsafeString(FCchartObj.xaxisname);

                /**
                 * configure y axis
                 */
                for (y = 0, len = HCObj.yAxis.length; y < len; y += 1) {
                    yAxisObj = HCObj.yAxis[y];
                    yAxisConf = conf[y];
                    yaxisvaluesstep = pluckNumber(yAxisConf.yAxisValuesStep, 1);
                    yaxisvaluesstep = yaxisvaluesstep < 1 ? 1 : yaxisvaluesstep;
                    yAxisMaxValue = yAxisConf.maxValue;
                    yAxisMinValue = yAxisConf.minValue;


                    // adaptiveymin is available for non-stack charts
                    setadaptiveymin = pluckNumber(yAxisConf.setadaptiveymin, 0);

                    setMinAsZero = stopMaxAtZero = !setadaptiveymin;
                    numDivLines = yAxisConf.numDivLines;
                    adjustDiv = yAxisConf.adjustdiv !== 0;
                    showLimits = yAxisConf.showLimits;
                    showDivLineValues = yAxisConf.showDivLineValues;


                    //////////////////////calculate the axis min max and the div interval for y axis ///////////////////
                    this.axisMinMaxSetter(yAxisObj, yAxisConf, yAxisMaxValue, yAxisMinValue, stopMaxAtZero,
                        setMinAsZero, numDivLines, adjustDiv);

                    // create label category and remove trend obj if out side limit
                    this.configurePlotLines(FCchartObj, HCObj, yAxisObj, yAxisConf, showLimits, showDivLineValues,
                        yaxisvaluesstep, this.numberFormatter, yAxisObj._isSY, undefined, yAxisObj._index);

                    if (yAxisObj.reversed && yAxisObj.min >= 0) {
                        HCObj.plotOptions.series.threshold = yAxisObj.max;
                    }

                }

            },
            spaceManager: function(hcJSON, fcJSON, width, height) {

                var iapi = this,
                    conf = hcJSON[CONFIGKEY],
                    axisConf,
                    canvasWidth, fcJSONChart = fcJSON.chart,
                    yAxisNamePadding, yAxisValuesPadding, rotateYAxisName,
                    yAxis,
                    isOpp,
                    numAxis,
                    numVisAxis,
                    cpObj,
                    totalOverflow,
                    maxPaddingAllowed,
                    leftFactor,
                    rightFactor,
                    y,
                    extraWidth,
                    canvasHeight,
                    yAxisObj,
                    leftSpace,
                    rightSpace,
                    axisPad,
                    axisOffset,
                    axisWidthUsed,
                    perAxisWidth,
                    axisSpecifficWidth,
                    extra,
                    legendObj,
                    maxHeight,
                    xc,
                    xl,
                    xr,
                    marginLeftExtraSpace = conf.marginLeftExtraSpace,
                    marginTopExtraSpace = conf.marginTopExtraSpace,
                    marginBottomExtraSpace = conf.marginBottomExtraSpace,
                    marginRightExtraSpace = conf.marginRightExtraSpace,
                    workingWidth = width - (marginLeftExtraSpace + marginRightExtraSpace +
                        hcJSON.chart.marginRight + hcJSON.chart.marginLeft),
                    workingHeight = height - (marginBottomExtraSpace + hcJSON.chart.marginBottom +
                        hcJSON.chart.marginTop),

                    //calculate the min width, height for canvas
                    /** @todo tis logic may change */
                    minCanWidth = workingWidth * 0.3,
                    minCanHeight = workingHeight * 0.3,

                    // calculate the space remaining
                    availableWidth = workingWidth - minCanWidth,
                    availableHeight = workingHeight - minCanHeight,

                    //if the legend is at the right then place it and deduct the width
                    //if at bottom calculate the space for legend after the vertical axis placed

                    legendPos = pluck(fcJSONChart.legendposition, POSITION_BOTTOM).toLowerCase();

                if (hcJSON.legend.enabled && legendPos === POSITION_RIGHT) {
                    availableWidth -= this.placeLegendBlockRight(hcJSON, fcJSON, availableWidth / 2, workingHeight);
                }

                /*
                 * place the vertical axis
                 */
                yAxis = hcJSON.yAxis;
                numAxis = yAxis.length;
                numVisAxis = numAxis - conf.noHiddenAxis;
                extraWidth = 0;
                if (numVisAxis) {
                    leftSpace = 0;
                    rightSpace = 0;
                    axisPad = 10;
                    perAxisWidth = availableWidth / numVisAxis;
                    for (y = numAxis - 1; y >= 0; y -= 1) {
                        yAxisObj = yAxis[y];
                        if (yAxisObj.showAxis) {
                            axisConf = conf[y];
                            isOpp = yAxisObj.opposite;
                            axisOffset = (isOpp ? rightSpace : leftSpace) + axisPad;
                            //add all axis margin pading
                            yAxisNamePadding = 4;
                            yAxisValuesPadding = axisConf.tickWidth;
                            rotateYAxisName = pluck(fcJSONChart.rotateyaxisname, isOpp ? 'cw' : 'ccw');
                            axisConf.verticalAxisNamePadding = yAxisNamePadding;
                            axisConf.fixedValuesPadding = yAxisValuesPadding;
                            axisConf.verticalAxisValuesPadding = yAxisValuesPadding;
                            axisConf.rotateVerticalAxisName = isOpp && rotateYAxisName !== 'ccw' ?
                                'cw' : rotateYAxisName;
                            axisConf.verticalAxisNameWidth = 50;
                            yAxisObj.offset = axisOffset;
                            axisSpecifficWidth = perAxisWidth + extraWidth - axisPad;
                            //now configure the axis
                            axisWidthUsed = placeVerticalAxis(yAxisObj, axisConf, hcJSON, fcJSON,
                                workingHeight, axisSpecifficWidth, isOpp, 0, 0);
                            axisWidthUsed += axisPad;

                            if (isOpp) {
                                rightSpace += axisWidthUsed;
                                hcJSON.chart.marginRight += axisPad;
                            } else {
                                leftSpace += axisWidthUsed;
                                hcJSON.chart.marginLeft += axisPad;
                            }

                            extra = axisSpecifficWidth - axisWidthUsed;
                            extraWidth = extra;
                            availableWidth -= axisWidthUsed;
                            if (availableWidth < axisPad) {
                                axisPad = 0;
                            }
                            yAxisObj._axisWidth = axisWidthUsed;
                        }
                    }
                }

                // adjust left and right canvas margins
                availableWidth -= adjustHorizontalCanvasMargin(hcJSON, fcJSON, availableWidth);

                /** @todo realocate space for secondary axis if requared */

                //now thw canvas width is fixed(no element to reduce the width
                canvasWidth = availableWidth + minCanWidth;

                if (hcJSON.legend.enabled && legendPos !== POSITION_RIGHT) {
                    availableHeight -= this.placeLegendBlockBottom(hcJSON, fcJSON, workingWidth,
                        availableHeight / 2);
                    //remove alignment if it is wider
                    if (hcJSON.legend.width > canvasWidth) {
                        hcJSON.legend.x = 0;
                    }
                }

                /*
                 * Now place the Title
                 */
                //allowed height may

                availableHeight -= iapi.titleSpaceManager(hcJSON, fcJSON, canvasWidth,
                    availableHeight / 2);

                /*
                 * Now place the horizontal axis
                 */
                //add all axis margin pading
                axisConf = conf.x;
                axisConf.horizontalAxisNamePadding = pluckNumber(fcJSONChart.xaxisnamepadding, 5);
                axisConf.horizontalLabelPadding = pluckNumber(fcJSONChart.labelpadding, 2);
                axisConf.labelDisplay = (fcJSONChart.rotatelabels == '1') ? 'rotate' :
                    pluck(fcJSONChart.labeldisplay, 'auto').toLowerCase();
                axisConf.staggerLines = pluckNumber(fcJSONChart.staggerlines, 2);
                axisConf.slantLabels = pluckNumber(fcJSONChart.slantlabels, fcJSONChart.slantlabel, 0);

                //set x axis min max
                cpObj = {
                    left: 0,
                    right: 0
                };
                cpObj = (hcJSON.chart.managePlotOverflow && this.canvasPaddingModifiers &&
                    this.calculateCanvasOverflow(hcJSON, true)) || cpObj;

                totalOverflow = cpObj.left + cpObj.right;

                // The maximum amount of padding that can be added to improve visualization
                // while maintaining aesthetics.
                maxPaddingAllowed = canvasWidth * 0.6;

                if (totalOverflow > maxPaddingAllowed) {
                    leftFactor = cpObj.left / (totalOverflow);
                    rightFactor = 1 - leftFactor;
                    cpObj.left -= (leftFactor * (totalOverflow - maxPaddingAllowed));
                    cpObj.right -= (rightFactor * (totalOverflow - maxPaddingAllowed));
                }

                this.xAxisMinMaxSetter(hcJSON, fcJSON, canvasWidth, cpObj.left, cpObj.right);

                availableHeight -= placeHorizontalAxis(hcJSON.xAxis, axisConf, hcJSON, fcJSON,
                    canvasWidth, availableHeight, minCanWidth);

                // adjust top and bottom the canvas margins here
                availableHeight -= adjustVerticalCanvasMargin(hcJSON, fcJSON, availableHeight, hcJSON.xAxis);

                // checking after the finalizing of the canvas height whether, and to what extent should we
                canvasHeight = minCanHeight + availableHeight;
                for (y = 0; y < numAxis; y += 1) {
                    // step them.
                    stepYAxisNames(canvasHeight, hcJSON, fcJSONChart, hcJSON.yAxis[y], conf[y].lYLblIdx);
                }


                if (hcJSON.legend.enabled && legendPos === POSITION_RIGHT) {
                    legendObj = hcJSON.legend;
                    maxHeight = minCanHeight + availableHeight;

                    if (legendObj.height > maxHeight) {
                        legendObj.height = maxHeight;
                        legendObj.scroll.enabled = true;
                        extraWidth = (legendObj.scroll.scrollBarWidth = 10) + (legendObj.scroll.scrollBarPadding = 2);
                        legendObj.width += extraWidth;
                        hcJSON.chart.marginRight += extraWidth;
                    }
                    legendObj.y = 20;
                }

                xc = hcJSON.chart.marginLeft + (canvasWidth / 2);
                xl = hcJSON.chart.marginLeft;
                xr = (-hcJSON.chart.marginRight);

                switch (hcJSON.title.align) {
                case POSITION_LEFT:
                    hcJSON.title.x = xl;
                    break;
                case POSITION_RIGHT:
                    hcJSON.title.x = xr;
                    break;
                default:
                    hcJSON.title.x = xc;
                }
                switch (hcJSON.subtitle.align) {
                case POSITION_LEFT:
                    hcJSON.subtitle.x = xl;
                    break;
                case POSITION_RIGHT:
                    hcJSON.subtitle.x = xr;
                    break;
                default:
                    hcJSON.subtitle.x = xc;
                }


                /*
                 * if the titles requared space and there has avaleble space the re-alocatethe title space
                 */
                /** @todo remove vertical axis labels that are overlaped and set the y for v lines */

                hcJSON.chart.marginLeft += marginLeftExtraSpace;
                hcJSON.chart.marginTop += marginTopExtraSpace;
                hcJSON.chart.marginBottom += marginBottomExtraSpace;
                hcJSON.chart.marginRight += marginRightExtraSpace;
            }
        }, chartAPI.mslinebase);

        ////////CandleStick///////
        chartAPI('candlestick', {
            friendlyName: 'Candlestick Chart',
            standaloneInit: true,
            creditLabel: creditLabel,
            paletteIndex: 3,
            defaultSeriesType: 'candlestick',
            canvasborderthickness: 1,
            rendererId: 'candlestick',
            chart: chartAPI.errorbar2d.chart,
            drawErrorValue: chartAPI.errorbar2d.drawErrorValue,

            series: function(FCObj, HCObj, chartName) {
                var index, length, conf = HCObj[CONFIGKEY],
                    series, seriesArr, datasetObj, trendsetObj, volumeHeightPercent,
                    plotHeight, volumeHeight, marginBottom,
                    FCChartObj = FCObj.chart,
                    HCChartObj = HCObj.chart,
                    showVolumeChart = pluckNumber(FCChartObj.showvolumechart, 1),
                    iapi = this,
                    colorM = iapi.colorManager,
                    tempNumberFormatter,
                    tempSmartLabel,
                    tempLabels,
                    volumeChart,
                    subCharts,
                    subConf,
                    trendGroup,
                    i;

                //enable the legend
                HCObj.legend.enabled = Boolean(pluckNumber(FCChartObj.showlegend, 1));
                HCChartObj.rollOverBandColor = convertColor(
                    pluck(FCChartObj.rolloverbandcolor, colorM.getColor('altHGridColor')),
                    pluck(FCChartObj.rolloverbandalpha, colorM.getColor('altHGridAlpha')));

                if (FCObj.dataset && FCObj.dataset.length > 0) {
                    // add category
                    iapi.categoryAdder(FCObj, HCObj);

                    //place the series in oppside
                    HCObj.yAxis[0].opposite = true;
                    conf.numdivlines = getValidValue(FCObj.chart.numpdivlines);

                    if (showVolumeChart) {
                        /*@Note: numberFormatter and smartLabel is causing
                         * infinite loop while extending HCObj to draw volumeChart.
                         */
                        tempNumberFormatter = HCObj._FCconf.numberFormatter;
                        tempLabels = HCObj.labels;
                        HCObj._FCconf.numberFormatter = {};
                        /** @todo: Need to remove the following code one we remove all uses of smartlabel
                         * from conf.
                         */
                        if (HCObj._FCconf.smartLabel) {
                            tempSmartLabel = HCObj._FCconf.smartLabel;
                            HCObj._FCconf.smartLabel = UNDEFINED;
                        }
                        HCObj.labels = {};
                        volumeChart = extend2({}, HCObj);
                        HCObj._FCconf.numberFormatter = tempNumberFormatter;
                        HCObj._FCconf.smartLabel = tempSmartLabel;
                        HCObj.labels = tempLabels;
                        // Initializing separate numberFormatter for volume chart
                        // as volume chart has separate attributes for number formatting
                        tempSmartLabel && (volumeChart._FCconf.smartLabel = tempSmartLabel);
                        volumeChart._FCconf.numberFormatter = new lib.NumberFormatter(
                                extend2(extend2({}, FCChartObj), {
                            forcedecimals: getFirstValue(FCChartObj.forcevdecimals,
                                FCChartObj.forcedecimals),
                            forceyaxisvaluedecimals: getFirstValue(
                                FCChartObj.forcevyaxisvaluedecimals,
                                FCChartObj.forceyaxisvaluedecimals),
                            yaxisvaluedecimals: getFirstValue(
                                FCChartObj.vyaxisvaluedecimals,
                                FCChartObj.yaxisvaluedecimals),
                            formatnumber: getFirstValue(FCChartObj.vformatnumber,
                                FCChartObj.formatnumber),
                            formatnumberscale: getFirstValue(
                                FCChartObj.vformatnumberscale,
                                FCChartObj.formatnumberscale),
                            defaultnumberscale: getFirstValue(
                                FCChartObj.vdefaultnumberscale,
                                FCChartObj.defaultnumberscale),
                            numberscaleunit: getFirstValue(
                                FCChartObj.vnumberscaleunit, FCChartObj.numberscaleunit),
                            vnumberscalevalue: getFirstValue(
                                FCChartObj.vnumberscalevalue,
                                FCChartObj.numberscalevalue),
                            scalerecursively: getFirstValue(
                                FCChartObj.vscalerecursively,
                                FCChartObj.scalerecursively),
                            maxscalerecursion: getFirstValue(
                                FCChartObj.vmaxscalerecursion,
                                FCChartObj.maxscalerecursion),
                            scaleseparator: getFirstValue(FCChartObj.vscaleseparator,
                                FCChartObj.scaleseparator),
                            numberprefix: getFirstValue(FCChartObj.vnumberprefix,
                                FCChartObj.numberprefix),
                            numbersuffix: getFirstValue(FCChartObj.vnumbersuffix,
                                FCChartObj.numbersuffix),
                            decimals: getFirstValue(FCChartObj.vdecimals,
                                FCChartObj.decimals)
                        }), iapi);

                        extend2(volumeChart, {
                            chart: {
                                backgroundColor: 'rgba(255,255,255,0)',
                                borderColor: 'rgba(255,255,255,0)',
                                animation: false

                            },
                            title: {
                                text: null
                            },
                            subtitle: {
                                text: null
                            },
                            legend: {
                                enabled: false
                            },
                            credits: {
                                enabled: false
                            },
                            xAxis: {
                                opposite: true,
                                labels: {
                                    enabled: false
                                }
                            },
                            yAxis: [{
                                opposite: true,
                                title: {
                                    //text: FCObj.chart.vyaxisname
                                },
                                plotBands: [],
                                plotLines: []
                            }, {
                                opposite: false,
                                title: {
                                    text: FCObj.chart.vyaxisname
                                }
                            }]
                        });
                        subCharts = HCObj.subCharts = [volumeChart];
                    }

                    // Add dataset series
                    for (index = 0, length = FCObj.dataset.length; index < length; index += 1) {
                        series = {
                            //yAxis: 1,
                            numColumns: length,
                            data: []
                        };
                        datasetObj = FCObj.dataset[index];
                        //add data to the series
                        seriesArr = iapi.point(chartName, series,
                            datasetObj, FCObj.chart, HCObj, conf.oriCatTmp.length,
                            index);

                        //if the returned series is an array of series (case: pareto)
                        if (seriesArr instanceof Array) {
                            if (showVolumeChart) {
                                //when it is an array then 2nd one is Volume chart
                                volumeChart.series.push({
                                    type: 'column',
                                    data: seriesArr[1]
                                });

                                volumeChart.showVolume = true;

                                volumeHeightPercent = pluckNumber(FCObj.chart.volumeheightpercent, 40);
                                volumeHeightPercent = volumeHeightPercent < 20 ? 20 : (volumeHeightPercent > 80 ? 80 :
                                    volumeHeightPercent);
                                plotHeight = conf.height - (HCObj.chart.marginBottom + HCObj.chart.marginTop);
                                volumeHeight = (plotHeight * volumeHeightPercent / 100);
                                marginBottom = HCObj.chart.marginBottom + volumeHeight;

                                volumeChart[CONFIGKEY].marginTop = marginBottom + 40;
                                volumeChart.yAxis[0].plotBands = [];
                                volumeChart.yAxis[0].plotLines = [];
                                volumeChart.exporting.enabled = false;
                                volumeChart.yAxis[0].title.text = parseUnsafeString(getValidValue(
                                    FCObj.chart.vyaxisname));
                                volumeChart.yAxis[0].title.align = 'low';
                                volumeChart.chart.height = volumeHeight + 20;
                                volumeChart.chart.width = conf.width;
                                volumeChart.chart.top = plotHeight - volumeHeight;
                                volumeChart.chart.left = 0;
                                volumeChart.chart.volumeHeightPercent = volumeHeightPercent;

                            }
                            HCObj.series.push(seriesArr[0]);
                        }
                        //all other case there will be only1 series
                        else {
                            HCObj.series.push(seriesArr);
                        }
                    }

                    // Add trendset series
                    if (FCObj.trendset && FCObj.trendset.length > 0) {
                        for (index = 0, length = FCObj.trendset.length; index < length; index += 1) {
                            series = {
                                type: 'line',
                                //yAxis: 1,
                                marker: {
                                    enabled: false
                                },
                                connectNullData: 1,
                                data: []
                            };
                            trendsetObj = FCObj.trendset[index];
                            //add data to the series
                            if (trendsetObj.data && trendsetObj.data.length > 0) {
                                seriesArr = iapi.getTrendsetPoint(chartName, series,
                                trendsetObj, FCObj.chart, HCObj, conf.oriCatTmp.length,
                                index);

                                HCObj.series.push(seriesArr);
                            }
                        }
                    }

                    // Making secondary yAxis default data Label hidden
                    FCObj.chart.showdivlinesecondaryvalue = 0;
                    FCObj.chart.showsecondarylimits = 0;

                    ///configure the axis
                    iapi.configureAxis(HCObj, FCObj);

                    // To show the yAxis name in the chart
                    // we use the secondary yAxis title and make opposite false
                    // so that the yAxis title appears on left side of the chart
                    HCObj.yAxis[1].opposite = false;
                    HCObj.yAxis[1].min = HCObj.yAxis[0].min;
                    HCObj.yAxis[1].max = HCObj.yAxis[0].max;
                    HCObj.yAxis[1].title.text = HCObj.yAxis[0].title.text;
                    HCObj.yAxis[0].title.text = BLANK;

                    if (showVolumeChart && subCharts) {
                        subCharts = subCharts[0];
                        subConf = subCharts[CONFIGKEY];
                        subConf.numdivlines = getValidValue(FCObj.chart.numvdivlines);
                        subConf[0].min = conf.volume && conf.volume.min;
                        subConf[0].max = conf.volume && conf.volume.max;

                        subCharts.series && subCharts.series[0] &&
                            (subCharts.series[0].showInLegend = false);
                        ///configure the axis
                        iapi.configureAxis(subCharts, FCObj);
                        subCharts.yAxis[0].title.text = parseUnsafeString(getValidValue(FCObj.chart.vyaxisname));
                        subCharts.yAxis[1].min = subCharts.yAxis[0].min;
                        subCharts.yAxis[1].max = subCharts.yAxis[0].max;
                        subCharts.yAxis[1].title.text = subCharts.yAxis[0].title.text;
                        subCharts.yAxis[0].title.text = BLANK;
                    }

                    ///////////Trend-lines /////////////////
                    //for log it will be done in configureAxis
                    trendGroup = FCObj.trendlines && FCObj.trendlines[0] && FCObj.trendlines[0].line;
                    if (trendGroup && trendGroup.length) {
                        for (i = 0; i < trendGroup.length; i += 1) {
                            trendGroup[i].parentyaxis = 's';
                            trendGroup[i].valueonleft = '1';
                        }
                        createTrendLine(FCObj.trendlines, HCObj.yAxis, conf,
                            true, iapi.isBar);
                    }
                }
            },

            getTrendsetPoint: function(chartName, series, trendset, FCChartObj, HCObj) {
                if (trendset.data) {
                    var
                    data = trendset.data,
                        length = data.length,
                        index = 0,
                        dataObj, itemValue, x,
                        trendSetColor, trendSetAlpha, trendSetThickness, trendSetDashed,
                        trendSetDashLen, trendSetDashGap, includeInLegend,
                        conf = HCObj[CONFIGKEY],
                        NumberFormatter = this.numberFormatter,
                        seriesYAxis = pluckNumber(series.yAxis, 0),
                        toolText, toolTextObj = conf.toolTextStore;

                    //Trend-sets default properties
                    trendSetColor = getFirstColor(pluck(trendset.color, FCChartObj.trendsetcolor, '666666'));
                    trendSetAlpha = pluck(trendset.alpha, FCChartObj.trendsetalpha, HUNDRED);
                    trendSetThickness = pluckNumber(trendset.thickness, FCChartObj.trendsetthickness, 2);
                    trendSetDashed = Boolean(pluckNumber(trendset.dashed, FCChartObj.trendsetdashed, 0));
                    trendSetDashLen = pluckNumber(trendset.dashlen, FCChartObj.trendsetdashlen, 4);
                    trendSetDashGap = pluckNumber(trendset.dashgap, FCChartObj.trendsetdashgap, 4);
                    includeInLegend = pluck(trendset.includeinlegend, 1);

                    series.color = convertColor(trendSetColor, trendSetAlpha);
                    series.lineWidth = trendSetThickness;
                    series.dashStyle = trendSetDashed ? getDashStyle(trendSetDashLen, trendSetDashGap) : undefined;
                    series.includeInLegend = includeInLegend;
                    series.name = getValidValue(trendset.name);
                    series.doNotUseBand = true;
                    // If includeInLegend set to false
                    // We set series.name blank
                    if (pluckNumber(trendset.includeinlegend) === 0 || series.name === undefined) {
                        series.showInLegend = false;
                    }
                    series.tooltip = {
                        enabled: false
                    };

                    // Stop interactive legend for CandleStick
                    FCChartObj.interactivelegend = 0;

                    for (index = 0, length = data.length; index < length; index += 1) {
                        dataObj = data[index];
                        if (dataObj && !dataObj.vline) {
                            itemValue = NumberFormatter.getCleanValue(dataObj.value);
                            x = NumberFormatter.getCleanValue(dataObj.x);
                            x = x !== null ? x : index + 1;
                            // tooltex
                            toolText = toolTextObj && toolTextObj[x];

                            series.data.push({
                                x: x,
                                y: itemValue,
                                toolText: toolText
                            });
                            // Fix for default value of setAdaptiveYMin #RED-856
                            this.pointValueWatchers(HCObj, null, itemValue,
                                itemValue, null, seriesYAxis);
                        }
                    }
                }
                return series;
            },

            point: function(chartName, series, dataset, FCChartObj, HCObj) {
                if (dataset.data) {
                    var chartNameAPI = chartAPI[chartName],
                        conf = HCObj[CONFIGKEY],
                        plotPriceAs = getValidValue(FCChartObj.plotpriceas, BLANK).toLowerCase(),
                        // Data array in dataset object
                        data = dataset.data,
                        dataLength = data && data.length,
                        // showValues attribute in individual dataset
                        NumberFormatter = this.numberFormatter,
                        candleSeries = [],
                        volumeSeries = [],
                        toolTextStore = {},
                        valueText, setColor, setBorderColor, setAlpha, dashStyle, drawVolume = false,
                        seriesYAxis = pluckNumber(series.yAxis, 0),
                        //Candle stick properties.
                        //Bear fill and border color - (Close lower than open)
                        bearBorderColor = getFirstColor(pluck(FCChartObj.bearbordercolor, 'B90000')),
                        bearFillColor = getFirstColor(pluck(FCChartObj.bearfillcolor, 'B90000')),
                        colorM = this.colorManager,
                        //Bull fill and border color - Close higher than open
                        bullBorderColor = getFirstColor(pluck(FCChartObj.bullbordercolor,
                            colorM.getColor('canvasBorderColor'))),
                        bullFillColor = getFirstColor(pluck(FCChartObj.bullfillcolor,
                            'FFFFFF')),
                        //Line Properties - Serves as line for bar & line and border for candle stick
                        plotLineThickness = series.lineWidth = pluckNumber(FCChartObj.plotlinethickness,
                            (plotPriceAs == 'line' || plotPriceAs == 'bar') ? 2 : 1),
                        plotLineAlpha = pluck(FCChartObj.plotlinealpha, HUNDRED),
                        plotLineDashLen = pluckNumber(FCChartObj.plotlinedashlen, 5),
                        plotLineDashGap = pluckNumber(FCChartObj.plotlinedashgap, 4),
                        //VPlotBorder is border properties for the volume chart.
                        vPlotBorderThickness = pluckNumber(FCChartObj.vplotborderthickness, 1),


                        // Anchor cosmetics in data points
                        // Getting anchor cosmetics for the data points or its default values
                        // The default value is different from flash in order to render a
                        // perfect circle when no anchorside is provided.
                        drawAnchors = !! pluckNumber(FCChartObj.drawanchors, 1),
                        setAnchorSides = pluckNumber(FCChartObj.anchorsides, 0),
                        setAnchorAngle = pluckNumber(FCChartObj.anchorstartangle, 90),
                        setAnchorRadius = pluckNumber(FCChartObj.anchorradius,
                            this.anchorRadius, 3),
                        setAnchorBorderColor = getFirstColor(pluck(FCChartObj.anchorbordercolor,
                            bullBorderColor)),
                        setAnchorBorderThickness = pluckNumber(FCChartObj.anchorborderthickness,
                            this.anchorBorderThickness, 1),
                        setAnchorBgColor = getFirstColor(pluck(FCChartObj.anchorbgcolor,
                            colorM.getColor('anchorBgColor'))),
                        setAnchorAlpha = pluck(FCChartObj.anchoralpha, '0'),
                        setAnchorBgAlpha = pluck(FCChartObj.anchorbgalpha, setAnchorAlpha),
                        pointShadow,
                        index,
                        dataObj,
                        pointStub,
                        catLabel,
                        toolText,
                        open,
                        close,
                        high,
                        low,
                        volume,
                        minValue,
                        maxValue,
                        x,
                        closeVal,
                        borderColor,
                        yVal,
                        openVal,
                        isCandleStick = false;

                    // Dataset seriesname
                    series.name = getValidValue(dataset.seriesname);

                    // Make the CandleStick chart legend off
                    series.showInLegend = false;


                    // Add marker to the series to draw the Legend
                    series.marker = {
                        //enabled: true
                    };

                    switch (plotPriceAs) {
                    case 'line':
                        series.plotType = 'line';
                        break;
                    case 'bar':
                        series.plotType = 'candlestickbar';
                        break;
                    default:
                        series.plotType = 'column';
                        series.errorBarWidthPercent = 0;
                        isCandleStick = true;
                        break;
                    }

                    // Iterate through all level data
                    for (index = 0; index < dataLength; index += 1) {
                        // Individual data obj
                        // for further manipulation
                        dataObj = data[index];
                        if (dataObj && !dataObj.vline) {
                            open = NumberFormatter.getCleanValue(dataObj.open);
                            close = NumberFormatter.getCleanValue(dataObj.close);
                            high = NumberFormatter.getCleanValue(dataObj.high);
                            low = NumberFormatter.getCleanValue(dataObj.low);
                            volume = NumberFormatter.getCleanValue(dataObj.volume, true);
                            x = NumberFormatter.getCleanValue(dataObj.x);
                            openVal = isCandleStick ? mathAbs(close - open) : open;
                            closeVal = mathMin(open, close);
                            yVal = mathMax(open, close);
                            if (volume !== null) {
                                drawVolume = true;
                            }

                            minValue = mathMin(open, close, high, low);
                            maxValue = mathMax(open, close, high, low);

                            valueText = parseUnsafeString(getValidValue(dataObj.valuetext, BLANK));

                            setBorderColor = getFirstColor(pluck(dataObj.bordercolor, close < open ? bearBorderColor :
                                bullBorderColor));
                            setAlpha = pluck(dataObj.alpha, HUNDRED);
                            setColor = convertColor(getFirstColor(pluck(dataObj.color, close < open ? bearFillColor :
                                bullFillColor)), setAlpha);
                            dashStyle = Boolean(pluckNumber(dataObj.dashed)) ? getDashStyle(plotLineDashLen,
                                plotLineDashGap) : undefined;
                            // Set alpha of the shadow
                            pointShadow = {
                                opacity: setAlpha / 100
                            };

                            catLabel = conf.oriCatTmp[index];

                            // Finally add the data
                            // we call getPointStub function that manage displayValue, toolText and link
                            borderColor = convertColor(setBorderColor, plotLineAlpha);
                            pointStub = chartNameAPI.getPointStub(HCObj, FCChartObj,
                                dataObj, open, close, high, low, volume, borderColor,
                                plotLineThickness, series.plotType, catLabel);

                            x = x ? x : index + 1;

                            toolTextStore[x] = pointStub.toolText;

                            series.data.push({
                                high: mathMax(open, close, high, low),
                                low: mathMin(open, close, high, low),
                                color: isCandleStick ? setColor : {
                                    FCcolor: {
                                        color: setBorderColor,
                                        alpha: setAlpha
                                    }
                                },
                                borderColor: borderColor,
                                shadow: pointShadow,
                                dashStyle: dashStyle,
                                borderWidth: plotLineThickness,
                                x: x,
                                y: pointStub.y,
                                categoryLabel: catLabel,
                                errorValue: pointStub.errorValue,
                                previousY: pointStub.previousY,
                                toolText: pointStub.toolText,
                                link: pointStub.link,
                                marker: {
                                    enabled: drawAnchors,
                                    fillColor: {
                                        FCcolor: {
                                            color: setAnchorBgColor,
                                            alpha: ((setAnchorBgAlpha * setAnchorAlpha) / 100) + BLANK
                                        }
                                    },
                                    lineColor: {
                                        FCcolor: {
                                            color: setAnchorBorderColor,
                                            alpha: setAnchorAlpha
                                        }
                                    },
                                    lineWidth: setAnchorBorderThickness,
                                    radius: setAnchorRadius,
                                    startAngle: setAnchorAngle,
                                    symbol: mapSymbolName(setAnchorSides)
                                }
                            });

                            toolText = getValidValue(parseUnsafeString(pluck(dataObj.volumetooltext,
                                dataset.volumetooltext, FCChartObj.volumetooltext)));
                            // If there is a separate tooltip for volume chart
                            // recalculate tooltip
                            if (toolText !== undefined) {
                                toolText = chartNameAPI.getPointStub(HCObj, FCChartObj,
                                    dataObj, open, close, high, low, volume, borderColor,
                                    plotLineThickness, series.plotType, catLabel, toolText).toolText;
                            } else {
                                toolText = pointStub.toolText;
                            }

                            volumeSeries.push({
                                y: volume,
                                categoryLabel: catLabel,
                                color: convertColor(setColor, setAlpha),
                                toolText: toolText,
                                borderWidth: vPlotBorderThickness,
                                borderColor: convertColor(setBorderColor,
                                    pluck(FCChartObj.plotlinealpha, dataObj.alpha)),
                                dashStyle: dashStyle,
                                shadow: pointShadow,
                                x: x,
                                link: dataObj.link
                            });

                            // Set the maximum and minimum found in data
                            // pointValueWatcher use to calculate the maximum and minimum value of the Axis
                            this.pointValueWatchers(HCObj, x, minValue, maxValue, volume, seriesYAxis);
                        }
                    }

                    // Storing the toolText in config to make trendset line tooltext
                    conf.toolTextStore = toolTextStore;

                    if ((series.drawVolume = drawVolume)) {
                        candleSeries.push(series, volumeSeries);
                    } else {
                        candleSeries = series;
                    }
                    return candleSeries;
                }
                return [];
            },

            getPointStub: function(HCObj, FCChartObj, dataObj, open, close, high,
                low, volume, borderColor, plotLineThickness, plotPriceAs, label, volumeToolText) {
                var toolText = BLANK,
                    HCConfig = HCObj[CONFIGKEY],
                    NumberFormatter = HCConfig.numberFormatter,
                    isLine = plotPriceAs === 'line',
                    closeVal = mathMin(open, close),
                    yVal = mathMax(open, close),
                    stub = {},
                    vNumberFormatter = (HCObj.subCharts && HCObj.subCharts[0] &&
                        HCObj.subCharts[0][CONFIGKEY].numberFormatter) || NumberFormatter;

                switch (plotPriceAs) {
                case 'line':
                    stub.y = close;
                    stub.link = pluck(dataObj.link);
                    break;
                case 'column':
                    stub.y = mathAbs(close - open);
                    stub.previousY = closeVal;
                    stub.link = pluck(dataObj.link);
                    stub.errorValue = [];
                    if (high - yVal > 0) {
                        stub.errorValue.push({
                            errorValue: high - yVal,
                            errorStartValue: yVal,
                            errorBarColor: borderColor,
                            errorBarThickness: plotLineThickness,
                            opacity: 1
                        });
                    }
                    if (low - closeVal < 0) {
                        stub.errorValue.push({
                            errorValue: low - closeVal,
                            errorStartValue: closeVal,
                            errorBarColor: borderColor,
                            errorBarThickness: plotLineThickness,
                            opacity: 1
                        });
                    }
                    break;
                default:
                    stub.y = open;
                    stub.previousY = close;
                    stub.link = pluck(dataObj.link);
                    break;
                }

                //create the tooltext
                if (!HCConfig.showTooltip) {
                    toolText = BLANK;
                } else {
                    toolText = getValidValue(parseUnsafeString(pluck(volumeToolText,
                        dataObj.tooltext, HCConfig.tooltext)));

                    if (toolText !== undefined) {
                        toolText = parseTooltext(toolText, [3, 5, 6, 10, 54, 55, 56, 57,
                            58, 59, 60, 61, 81, 82
                        ], {
                            label: label,
                            yaxisName: parseUnsafeString(FCChartObj.yaxisname),
                            xaxisName: parseUnsafeString(FCChartObj.xaxisname),
                            openValue: dataObj.open,
                            openDataValue: NumberFormatter.dataLabels(open),
                            closeValue: dataObj.close,
                            closeDataValue: NumberFormatter.dataLabels(close),
                            highValue: dataObj.high,
                            highDataValue: NumberFormatter.dataLabels(high),
                            lowValue: dataObj.low,
                            lowDataValue: NumberFormatter.dataLabels(low),
                            volumeValue: dataObj.volume,
                            volumeDataValue: NumberFormatter.dataLabels(volume)
                        }, dataObj, FCChartObj);
                    } else {
                        toolText = (open !== null && !isLine) ? '<b>Open:</b> ' + NumberFormatter.dataLabels(open) +
                            '<br/>' : BLANK;
                        toolText += close !== null ? '<b>Close:</b> ' + NumberFormatter.dataLabels(close) + '<br/>' :
                            BLANK;
                        toolText += (high !== null && !isLine) ? '<b>High:</b> ' + NumberFormatter.dataLabels(high) +
                            '<br/>' : BLANK;
                        toolText += (low !== null && !isLine) ? '<b>Low:</b> ' + NumberFormatter.dataLabels(low) +
                            '<br/>' : BLANK;
                        toolText += volume !== null ? '<b>Volume:</b> ' + vNumberFormatter.dataLabels(volume) : BLANK;
                    }
                }
                stub.toolText = toolText;

                return stub;
            },

            pointValueWatchers: function(HCObj, valueX, min, max, volume, yAxisIndex) {
                var obj, conf = HCObj[CONFIGKEY],
                    objX;
                yAxisIndex = pluckNumber(yAxisIndex, 0);
                if (volume !== null) {
                    obj = conf.volume;
                    if (!obj) {
                        obj = conf.volume = {};
                    }
                    obj.max = obj.max > volume ? obj.max : volume;
                    obj.min = obj.min < volume ? obj.min : volume;
                }
                if (min !== null) {
                    obj = conf[yAxisIndex];
                    (!obj.max && obj.max !== 0) && (obj.max = min);
                    (!obj.min && obj.min !== 0) && (obj.min = min);
                    obj.max = mathMax(obj.max, min);
                    obj.min = mathMin(obj.min, min);
                }
                if (max !== null) {
                    obj = conf[yAxisIndex];
                    (!obj.max && obj.max !== 0) && (obj.max = max);
                    (!obj.min && obj.min !== 0) && (obj.min = max);
                    obj.max = mathMax(obj.max, max);
                    obj.min = mathMin(obj.min, max);
                }
                if (valueX !== null) {
                    objX = conf.x;
                    objX.max = objX.max > valueX ? objX.max : valueX;
                    objX.min = objX.min < valueX ? objX.min : valueX;
                }
            },

            spaceManager: function(hcJSON, fcJSON, width, height) {

                var conf = hcJSON[CONFIGKEY],
                    axisConf, fcJSONChart = fcJSON.chart,
                    hcChartObj = hcJSON.chart,
                    yAxisNamePadding, yAxisValuesPadding, rotateYAxisName,
                    smartLabel = this.smartLabel || conf.smartLabel,
                    xMin = conf.x.min,
                    xMax = conf.x.max,
                    volumeRightSpace,
                    volumeLeftSpace,
                    marginLeftExtraSpace = conf.marginLeftExtraSpace,
                    marginBottomExtraSpace = conf.marginBottomExtraSpace,
                    marginRightExtraSpace = conf.marginRightExtraSpace,
                    workingWidth = width - (marginLeftExtraSpace + marginRightExtraSpace +
                        hcChartObj.marginRight + hcChartObj.marginLeft),
                    workingHeight = height - (marginBottomExtraSpace +
                        //hcChartObj.marginBottom +
                        0 +
                        hcChartObj.marginTop),

                    //calculate the min width, height for canvas
                    /** @todo tis logic may change */
                    minCanWidth = workingWidth * 0.3,

                    // calculate the space remaining
                    avaiableWidth = workingWidth - minCanWidth,

                    //if the legend is at the right then place it and deduct the width
                    //if at bottom calculate the space for legend after the vertical axis placed

                    yAxis = hcJSON.yAxis,
                    isOpp,
                    numAxis = yAxis.length,
                    y, yAxisObj,
                    leftSpace = 0,
                    rightSpace = 0,
                    axisPad = 8,
                    axisOffset,
                    extraWidth = 0,
                    perAxisWidth = avaiableWidth / numAxis,
                    axisSpecifficWidth,
                    canvasBorderThickness = mathMax(pluckNumber(hcChartObj.plotBorderWidth, 1), 0),
                    subChart,
                    vChartXLineSpace,
                    mainChartHeight,
                    volumeHeightPercent,
                    volumeChartHeight,
                    marginBetweenCharts,
                    index, length, xaxisObj, newXaxisObj, xAxis, yAxisName;

                this.base.spaceManager.apply(this, arguments);
                hcJSON.xAxis.min = xMin - 0.5;
                hcJSON.xAxis.max = xMax + 0.5;
                hcJSON.yAxis[0].title.centerYAxis = hcJSON.yAxis[1].title.centerYAxis = true;
                //---- SpaceManagement For Volume Charts ----//
                if (hcJSON.subCharts) {
                    subChart = hcJSON.subCharts[0];
                    vChartXLineSpace = (hcJSON.xAxis.showLine ? hcJSON.xAxis.lineThickness : canvasBorderThickness);
                    mainChartHeight = height - (hcChartObj.marginTop + hcChartObj.marginBottom + vChartXLineSpace +
                        canvasBorderThickness);
                    volumeHeightPercent = subChart.chart.volumeHeightPercent;
                    marginBetweenCharts = (conf.horizontalAxisHeight || 15) + canvasBorderThickness;

                    volumeChartHeight = (mainChartHeight * volumeHeightPercent / 100);

                    hcChartObj.marginBottom += volumeChartHeight + vChartXLineSpace + canvasBorderThickness;

                    // Copying xAxis form main chart to Volume chart.
                    xAxis = extend2({}, hcJSON.xAxis);

                    // Removing all trendline labels for CandleStick Chart
                    for (index = 0, length = hcJSON.xAxis.plotBands.length; index < length; index += 1) {
                        xaxisObj = hcJSON.xAxis.plotBands[index];
                        if (xaxisObj && xaxisObj.label && xaxisObj.label.text) {
                            xaxisObj.label.text = ' ';
                        }

                        newXaxisObj = xAxis.plotBands[index];
                        if (newXaxisObj && newXaxisObj.label && newXaxisObj.label.y) {
                            newXaxisObj.label.y = pluckFontSize(fcJSONChart.basefontsize, 10) + 4 + // 4 px looks proper
                            vChartXLineSpace;
                        }
                    }

                    // Removing all data labels from volumeChart
                    for (index = 0, length = xAxis.plotLines.length; index < length; index += 1) {
                        xaxisObj = xAxis.plotLines[index];
                        if (xaxisObj && xaxisObj.label && xaxisObj.label.text) {
                            xaxisObj.label.text = BLANK;
                        }
                    }
                    // Clearing the Volume chart primary axis label title
                    if (subChart.yAxis && subChart.yAxis[0] && subChart.yAxis[0].title && subChart.yAxis[0].title.text)
                    {
                        subChart.yAxis[0].title.text = BLANK;
                    }
                    subChart.xAxis = xAxis;
                    // deleting yAxis label text
                    //xAxis.plotLines[0].label.text = BLANKSTRING;

                    rotateYAxisName = pluck(fcJSON.chart.rotateyaxisname, 'ccw');
                    // Backward compatibility.
                    rotateYAxisName = (rotateYAxisName === ZEROSTRING) ? 'none' : rotateYAxisName;

                    // rapping Volume chart yAxis label title text.
                    if (yAxis[1].title.rotation) {
                        yAxisName = smartLabel.getSmartText(subChart.yAxis[1].title.text,
                            rotateYAxisName === 'none' ? hcChartObj.marginLeft - 10 : volumeChartHeight, undefined,
                                true).text;
                    } else {
                        yAxisName = smartLabel.getSmartText(subChart.yAxis[1].title.text,
                            smartLabel.getOriSize(yAxis[1].title.text).width, undefined, true).text;
                    }

                    /**
                     * Volume Chart
                     * place the vertical axis
                     */
                    yAxis = subChart.yAxis;
                    numAxis = yAxis.length;
                    leftSpace = 0;
                    rightSpace = 0;
                    axisPad = 0;
                    extraWidth = 0;
                    perAxisWidth = avaiableWidth / numAxis;
                    for (y = numAxis - 1; y >= 0; y -= 1) {
                        yAxisObj = yAxis[y];
                        axisConf = conf[y];

                        isOpp = yAxisObj.opposite;
                        axisOffset = (isOpp ? rightSpace : leftSpace) + axisPad;
                        rotateYAxisName = pluck(fcJSON.chart.rotateyaxisname, isOpp ? 'cw' : 'ccw');
                        // Backward compatibility.
                        rotateYAxisName = (rotateYAxisName === ZEROSTRING) ? 'none' : rotateYAxisName;

                        //add all axis margin pading
                        yAxisNamePadding = 10;
                        yAxisValuesPadding = pluckNumber(fcJSONChart.yaxisvaluespadding, fcJSONChart.labelypadding, 4);
                        if (yAxisValuesPadding < canvasBorderThickness) {
                            yAxisValuesPadding = canvasBorderThickness;
                        }
                        axisConf.verticalAxisNamePadding = yAxisNamePadding;
                        axisConf.verticalAxisValuesPadding = yAxisValuesPadding + (yAxisObj.showLine ?
                            yAxisObj.lineThickness : 0);
                        axisConf.rotateVerticalAxisName = rotateYAxisName;
                        yAxisObj.offset = axisOffset;
                        axisSpecifficWidth = perAxisWidth + extraWidth - axisPad;

                        //now configure the axis
                        if (isOpp) {
                            volumeRightSpace = placeVerticalAxis(yAxisObj, axisConf, subChart, fcJSON,
                                workingHeight, hcChartObj.marginRight, !! isOpp, 0, 0, rightSpace);
                        } else {
                            volumeLeftSpace = placeVerticalAxis(yAxisObj, axisConf, subChart, fcJSON,
                                workingHeight, hcChartObj.marginLeft, !! isOpp, 0, 0, leftSpace);
                        }
                    }

                    // setting the Primary chart yAxis title style to Volume Chart title
                    yAxis = hcJSON.yAxis;
                    subChart.yAxis[1].title = extend2({}, hcJSON.yAxis[1].title);
                    subChart.yAxis[1].title.style = hcJSON.orphanStyles.vyaxisname.style;
                    subChart.yAxis[1].title.text = yAxisName;

                    // deleting yAxis label text
                    //xAxis.plotLines[0].label.text = BLANKSTRING;

                    subChart.chart.left = 0;
                    subChart.chart.width = width;
                    subChart.chart.top = (height - hcChartObj.marginBottom) + marginBetweenCharts;
                    // 20 is the height needed to show the horizontal axis
                    subChart.chart.height = hcChartObj.marginBottom - marginBetweenCharts;

                    volumeRightSpace = Math.max(hcChartObj.marginRight, volumeRightSpace + hcChartObj.spacingRight);
                    volumeLeftSpace = Math.max(hcChartObj.marginLeft, volumeLeftSpace + hcChartObj.spacingLeft);
                    subChart.chart.marginLeft = hcChartObj.marginLeft = volumeLeftSpace;
                    subChart.chart.marginRight = hcChartObj.marginRight = volumeRightSpace;
                    subChart.chart.marginTop = 5;
                    subChart.chart.marginBottom = hcChartObj.marginBottom - (marginBetweenCharts + volumeChartHeight);
                    hcJSON.yAxis.push(subChart.yAxis[0], subChart.yAxis[1]);
                    subChart.xAxis.startY = yAxis[2].startY = yAxis[3].startY = subChart.chart.top +
                        subChart.chart.marginTop;
                    subChart.xAxis.endY = yAxis[2].endY = yAxis[3].endY = (subChart.yAxis[0].startY +
                        subChart.chart.height) - subChart.chart.marginBottom;

                    if (subChart.series[0]) {
                        subChart.series[0].yAxis = 3;
                        hcJSON.series.push(subChart.series[0]);
                    }

                    hcJSON.xAxis = [hcJSON.xAxis, subChart.xAxis];
                    hcJSON.yAxis[2].title.centerYAxis = hcJSON.yAxis[3].title.centerYAxis = true;
                }
            },
            isDual: true,
            numVDivLines: 0,
            defSetAdaptiveYMin: true,
            divLineIsDashed: 1,
            isCandleStick: true,
            defaultPlotShadow: 1,
            requiredAutoNumericLabels: 1
        }, chartAPI.scatterbase);

        /**
         * CandleStick chart
         */
        // 1 - Set default options

        // 4 - add the constractor
        /* Spline Charts */
        chartAPI('kagi', {
            friendlyName: 'Kagi Chart',
            standaloneInit: true,
            stepLine: true,
            creditLabel: creditLabel,
            defaultSeriesType: 'kagi',
            defaultZeroPlaneHighlighted: false,
            setAdaptiveYMin: 1,
            canvasPadding: 15,
            isKagi: 1,
            rendererId: 'kagi',


            pointValueWatcher: function(HCObj, value, yAxisIndex) {
                if (value !== null) {
                    var obj, FCconf = HCObj[CONFIGKEY];
                    yAxisIndex = pluckNumber(yAxisIndex, 0);

                    if (!FCconf[yAxisIndex]) {
                        FCconf[yAxisIndex] = {};
                    }
                    obj = FCconf[yAxisIndex];

                    this.maxValue = obj.max = obj.max > value ? obj.max : value;
                    this.minValue = obj.min = obj.min < value ? obj.min : value;
                }
            },


            point: function(chartName, series, data, FCChartObj, HCObj) {
                var HCChartObj = HCObj.chart,
                    // length of the data
                    length = data.length,
                    conf = HCObj[CONFIGKEY],
                    catIndex = 0,
                    xAxisConf = conf.x,
                    NumberFormatter = HCObj[CONFIGKEY].numberFormatter,
                    colorM = this.colorManager,
                    itemValue,
                    index,
                    dataLabel,
                    dataObj,
                    countPoint,
                    showLabel,
                    pointShadow,
                    lineAlpha,
                    lineThickness,
                    drawAnchors,
                    lineColorDef,
                    lineAlphaDef,
                    pointAnchorEnabled,
                    // set attributes
                    setAnchorSides,
                    setAnchorBorderThickness,
                    setAnchorBorderColor,
                    setAnchorRadius,
                    setAnchorBgColor,
                    setAnchorAlpha,
                    setAnchorBgAlpha,
                    hoverEffects,
                    setAnchorAngle,
                    anchorShadow,
                    setAnchorShadow,
                    imageUrl,
                    imageScale,
                    imageAlpha;

                // Managing line series cosmetics
                // Color of the line
                lineColorDef = getFirstColor(pluck(FCChartObj.linecolor,
                    FCChartObj.palettecolors,
                    colorM.getColor('plotFillColor')));
                // alpha
                lineAlphaDef = pluckNumber(FCChartObj.linealpha, 100);
                // thickness
                lineThickness = pluckNumber(FCChartObj.linethickness, 2);

                // set the line color and alpha to
                // HC seris obj with FusionCharts color format using FCcolor obj
                series.color = {
                    FCcolor: {
                        color: lineColorDef,
                        alpha: lineAlphaDef
                    }
                };

                // anchor shadow
                anchorShadow = series.anchorShadow = pluckNumber(FCChartObj.anchorshadow, 0);

                // set the line thickness (line width)
                series.lineWidth = lineThickness;

                // IF its a step line chart
                series.step = this.stepLine;
                // Special attribute for StepLine (drawVerticalJoins)
                series.drawVerticalJoins = Boolean(pluckNumber(FCChartObj.drawverticaljoins, 1));
                //series.useForwardSteps = Boolean(pluckNumber(FCChartObj.useforwardsteps, 1));

                // Managing line series markers
                // Whether to drow the Anchor or not
                drawAnchors = pluckNumber(FCChartObj.drawanchors,
                    FCChartObj.showanchors);

                // Iterate through all level data
                for (index = 0, countPoint = 0; index < length; index += 1) {
                    // individual data obj
                    // for further manipulation
                    dataObj = data[index];

                    // Managing vLines in between <set> elements
                    // We are not taking care of vLine here
                    if (dataObj.vline) {
                        continue;
                    }
                    // get the valid value
                    // parsePointValue check the its a value value of not and return
                    // the valid value
                    itemValue = NumberFormatter.getCleanValue(dataObj.value);

                    if (itemValue == null) {
                        continue;
                    }

                    // we check showLabel in individual data
                    // if its set to 0 than we do not show the particular label
                    showLabel = pluckNumber(dataObj.showlabel,
                        FCChartObj.showlabels, 1);

                    // Label of the data
                    // getFirstValue returns the first defined value in arguments
                    // we check if showLabel is not set to 0 in data
                    // then we take the label given in data, it can be given
                    // using label as well as name too
                    // we give priority to label if label is not there,
                    // we check the name attribute
                    dataLabel = parseUnsafeString(!showLabel ? BLANK :
                        getFirstValue(dataObj.label, dataObj.name));

                    catIndex += 1;

                    lineAlpha = pluckNumber(dataObj.linealpha, lineAlphaDef);

                    pointShadow = {
                        opacity: lineAlpha / 100
                    };

                    // Anchor cosmetics in data points
                    // Getting anchor cosmetics for the data points or its default values
                    // The default value is different from flash in order to render a
                    // perfect circle when no anchorside is provided.
                    setAnchorSides = pluckNumber(dataObj.anchorsides,
                        FCChartObj.anchorsides, 0);
                    setAnchorAngle = pluckNumber(dataObj.anchorstartangle,
                        FCChartObj.anchorstartangle, 90);
                    setAnchorRadius = pluckNumber(dataObj.anchorradius,
                        FCChartObj.anchorradius, this.anchorRadius, 3);
                    setAnchorBorderColor = getFirstColor(pluck(dataObj.anchorbordercolor,
                        FCChartObj.anchorbordercolor, lineColorDef));
                    setAnchorBorderThickness = pluckNumber(dataObj.anchorborderthickness,
                        FCChartObj.anchorborderthickness, this.anchorBorderThickness, 1);
                    setAnchorBgColor = getFirstColor(pluck(dataObj.anchorbgcolor,
                        FCChartObj.anchorbgcolor, colorM.getColor('anchorBgColor')));
                    setAnchorAlpha = pluck(dataObj.anchoralpha, FCChartObj.anchoralpha,
                        HUNDRED);
                    setAnchorBgAlpha = pluck(dataObj.anchorbgalpha,
                        FCChartObj.anchorbgalpha, setAnchorAlpha);
                    pointAnchorEnabled = drawAnchors === undefined ?
                        lineAlpha !== 0 : !! drawAnchors;

                    setAnchorShadow = Boolean(pluckNumber(dataObj.anchorshadow,
                        anchorShadow, 0));
                    imageUrl = pluck(dataObj.anchorimageurl, FCChartObj.anchorimageurl);
                    imageScale = pluck(dataObj.anchorimagescale, FCChartObj.anchorimagescale, 100);
                    imageAlpha = pluck(dataObj.anchorimagealpha, FCChartObj.anchorimagealpha, 100);

                    // Point hover effects
                    hoverEffects = this.pointHoverOptions(dataObj, series, {
                        plotType: 'anchor',
                        anchorBgColor: setAnchorBgColor,
                        anchorAlpha: setAnchorAlpha,
                        anchorBgAlpha: setAnchorBgAlpha,
                        anchorAngle: setAnchorAngle,
                        anchorBorderThickness: setAnchorBorderThickness,
                        anchorBorderColor: setAnchorBorderColor,
                        anchorBorderAlpha: setAnchorAlpha,
                        anchorSides: setAnchorSides,
                        anchorRadius: setAnchorRadius,

                        imageUrl: imageUrl,
                        imageScale: imageScale,
                        imageAlpha: imageAlpha,

                        shadow: pointShadow
                    });

                    // Finally add the data
                    // we call getPointStub function that manage displayValue, toolText and link
                    series.data.push(extend2(
                        this.getPointStub(dataObj, itemValue, dataLabel, HCObj), {
                            y: itemValue,
                            color: lineColorDef,
                            shadow: pointShadow,
                            dashStyle: dataObj.dashed,
                            valuePosition: pluck(dataObj.valueposition, HCChartObj.valuePosition),
                            isDefined: true,
                            marker: {
                                enabled: !! pointAnchorEnabled,
                                shadow: setAnchorShadow && {
                                    opacity: setAnchorAlpha / 100
                                },
                                fillColor: {
                                    FCcolor: {
                                        color: setAnchorBgColor,
                                        alpha: ((setAnchorBgAlpha * setAnchorAlpha) / 100) + BLANK
                                    }
                                },
                                lineColor: {
                                    FCcolor: {
                                        color: setAnchorBorderColor,
                                        alpha: setAnchorAlpha
                                    }
                                },
                                lineWidth: setAnchorBorderThickness,
                                radius: setAnchorRadius,
                                startAngle: setAnchorAngle,
                                symbol: mapSymbolName(setAnchorSides),
                                imageUrl: imageUrl,
                                imageScale: imageScale,
                                imageAlpha: imageAlpha
                            },
                            hoverEffects: hoverEffects.enabled && hoverEffects.options,
                            rolloverProperties: hoverEffects.enabled && hoverEffects.rolloverOptions
                        }));

                    // Set the maximum and minimum found in data
                    // pointValueWatcher use to calculate the maximum and minimum value of the Axis
                    this.pointValueWatcher(HCObj, itemValue);
                    countPoint += 1;
                }
                xAxisConf.catCount = catIndex;
                //return series
                return series;
            },

            postSeriesAddition: function(HCObj, FCObj) {
                var series = HCObj.series[0],
                    FCChartObj = FCObj.chart,
                    data = FCObj.data,
                    hcData = series && series.data,
                    length = hcData && hcData.length,
                    conf = HCObj[CONFIGKEY],
                    xAxisConf = conf.x,
                    // axisGridManager to manage the axis
                    // it contains addVline, addXaxisCat, addAxisAltGrid and
                    // addAxisGridLine function
                    axisGridManager = conf.axisGridManager,
                    xAxisObj = HCObj.xAxis,
                    // First vertical point for shift is yet to be obtained
                    isRallyInitialised = false,
                    // Initialised to one to avoid zero dividing the width of the canvas
                    // (as the case may be) to get the xShiftLength
                    shiftCounter = 0,
                    vLinePosition = 0.5,
                    // The value which determines whether to make a horizontal shift
                    // to deal with the next point
                    reversalValue = pluckNumber(FCChartObj.reversalvalue, -1),
                    // The percentage of the range of values, which determines whether
                    // to make a horizontal shift to deal with the next point
                    reversalPercentage = pluckNumber(FCChartObj.reversalpercentage, 5),
                    // To find the range of values in the chart for use in
                    // calculating reversal value by percentage (optional)
                    valueMax = this.maxValue,
                    valueMin = this.minValue,
                    lastPlotValue,
                    setShowLabel,
                    // Boolean local variables declared
                    isRally,
                    isMovingUp,
                    isShift,
                    // Number local variables declared
                    dataValue,
                    nextDataValue,
                    plotValue,
                    lastLow,
                    lastHigh,
                    // String local variables declared
                    vAlign,
                    align,
                    dataObj,
                    prevDataObj,
                    valueDifference,
                    fcDataObj,
                    showLabel,
                    dataLabel,
                    index,
                    fcIndex,
                    checkValue,
                    lastShift,
                    lastFcDataObj = {},
                    rallyDashLen,
                    rallyDashGap,
                    declineDashLen,
                    declineDashGap,
                    t;

                if (hcData && hcData.length) {
                    // Color of line denoting rally
                    series.rallyColor = pluck(FCChartObj.rallycolor, 'FF0000');
                    series.rallyAlpha = pluckNumber(FCChartObj.rallyalpha,
                        FCChartObj.linealpha, 100);
                    //color of line denoting decline
                    series.declineColor = pluck(FCChartObj.declinecolor, '0000FF');
                    series.declineAlpha = pluckNumber(FCChartObj.declinealpha,
                        FCChartObj.linealpha, 100);

                    // Thickness of line denoting rally
                    series.rallyThickness = pluckNumber(FCChartObj.rallythickness,
                        FCChartObj.linethickness, 2);
                    // length of the dash
                    rallyDashLen = pluckNumber(FCChartObj.rallydashlen,
                        FCChartObj.linedashlen, 5);
                    // distance between dash
                    rallyDashGap = pluckNumber(FCChartObj.rallydashgap,
                        FCChartObj.linedashgap, 4);

                    // Thickness of line denoting decline
                    series.declineThickness = pluckNumber(FCChartObj.declinethickness,
                        FCChartObj.linethickness, 2);
                    // length of the dash
                    declineDashLen = pluckNumber(FCChartObj.declinedashlen,
                        FCChartObj.linedashlen, 5);
                    // distance between dash
                    declineDashGap = pluckNumber(FCChartObj.declinedashgap,
                        FCChartObj.linedashgap, 4);

                    series.lineDashed = {
                        'true': pluckNumber(FCChartObj.rallydashed,
                            FCChartObj.linedashed, 0),
                        'false': pluckNumber(FCChartObj.declinedashed,
                            FCChartObj.linedashed, 0)
                    };

                    // Storing dashStyle in series to be use while drawing graph and
                    series.rallyDashed = pluckNumber(FCChartObj.rallydashed,
                        FCChartObj.linedashed, 0) ? getDashStyle(rallyDashLen, rallyDashGap,
                        series.rallyThickness) : undefined;

                    series.declineDashed = pluckNumber(FCChartObj.declinedashed,
                        FCChartObj.linedashed, 0) ? getDashStyle(declineDashLen, declineDashGap,
                        series.declineThickness) : undefined;

                    //canvasPadding to be use by Kagi chart Drawing
                    series.canvasPadding = pluckNumber(FCChartObj.canvaspadding,
                        this.canvasPadding, 15);

                    //setting the reversal value
                    reversalValue = (reversalValue > 0) ?
                        reversalValue : reversalPercentage * (valueMax - valueMin) / 100;

                    // Initialised by the first data value
                    lastPlotValue = hcData[0].y;
                    // Local function to set anchor and value visibility of
                    // unwanted points, after the first point is found to draw
                    // vertical kagi line
                    setShowLabel = function(id, _isRally) {
                        // Initial data value
                        var dataXValue, r = 1,
                            data1Value = hcData[0].y;
                        // Looping to check for unwanted points
                        while (r < id) {
                            // Value of point under check
                            dataXValue = hcData[r].y;
                            // If current trend is rally
                            if (_isRally) {
                                if (dataXValue <= data1Value) {
                                    hcData[r].isDefined = false;
                                }
                                // Else current trend is decline
                            } else {
                                if (dataXValue >= data1Value) {
                                    hcData[r].isDefined = false;
                                }
                            }
                            r += 1;
                        }
                        // Setting alignment of value for the first data
                        hcData[0].vAlign = (_isRally) ? POSITION_BOTTOM :
                            POSITION_TOP;
                        hcData[0].align = 'center';
                    };

                    length = data && data.length;
                    //iterating to set values of properties in data for each respective
                    //point (main algorithm of KagiChart)
                    //loop counter starts from 2 since data for plot 1 is unique
                    for (index = 0, fcIndex = 0; fcIndex < length; fcIndex += 1) {
                        fcDataObj = data[fcIndex];
                        // Calculation of vLine based on hShift.
                        if (fcDataObj && fcDataObj.vline) {
                            index && axisGridManager.addVline(xAxisObj, fcDataObj,
                                vLinePosition, HCObj);
                            continue;
                        }
                        lastFcDataObj = data[fcIndex];
                        // Special handling for vLines
                        if (lastShift) {
                            lastShift = false;
                            vLinePosition += 0.5;
                        }

                        if (index && (dataObj = hcData[index])) {
                            // HC data Obj
                            prevDataObj = hcData[index - 1];

                            dataObj.vAlign = 'middle';
                            dataObj.align = POSITION_RIGHT;
                            dataObj.showLabel = false;
                            //initialised to null each time
                            plotValue = null;
                            //data value of plot under current loop
                            dataValue = dataObj.y;
                            //data value of previous plot
                            //lastDataValue = data[i-1].y;
                            //data value of next plot
                            nextDataValue = hcData[index + 1] && hcData[index + 1].y;
                            valueDifference = mathAbs(lastPlotValue - dataValue);

                            //if current plot is yet render the trend,then care is taken
                            //to make few initial assumptions as algorithm starts with it
                            if (!isRallyInitialised) {
                                //if current plot is higher than the last plotted one
                                //(first data) by significant amount
                                if (dataValue > lastPlotValue && valueDifference > reversalValue) {
                                    //is assumed to be true
                                    isRally = true;
                                    //value of last low point of swing (assumed)
                                    lastLow = lastPlotValue;
                                    //none assumed
                                    lastHigh = null;
                                    //kagi rising
                                    isMovingUp = true;
                                    //first vertical point for shift is obtained
                                    isRallyInitialised = true;
                                    //call of local function to set visibility false for
                                    //anchors and values of unwanted points
                                    setShowLabel(index, isRally);
                                    //if current plot is lower than the last plotted one
                                    //(first data) by significant amount
                                } else if (dataValue < lastPlotValue && valueDifference > reversalValue) {
                                    //is assumed to be false
                                    isRally = false;
                                    //none assumed
                                    lastLow = null;
                                    //value of last high point of swing (assumed)
                                    lastHigh = lastPlotValue;
                                    //kagi falling
                                    isMovingUp = false;
                                    //first vertical point for shift is obtained
                                    isRallyInitialised = true;
                                    //call of local function to set visibility false for
                                    //anchors and values of unwanted points
                                    setShowLabel(index, isRally);
                                    // else, point under loop is not significant to
                                    // draw the first vertical kagi line to
                                } else {
                                    //is set to null
                                    isRally = null;
                                    //vertical shifting direction is set to null
                                    isMovingUp = null;
                                    //first vertical point for shift is yet to be obtained
                                    isRallyInitialised = false;
                                }
                                //trend property for plot 1 is set
                                if (defined(prevDataObj)) {
                                    prevDataObj.isRally = isRally;
                                }
                                if (isRally != null) {
                                    //to get the initial horizontal line in trend color
                                    //(in case data[1].value = data[2].value=... so on or not)
                                    hcData[0].isRally = isRally;
                                }
                                //else, for plot 3 and above, only trend is evaluated
                            } else {
                                //setting trends by concept of Kagi Chart
                                if (dataValue < lastLow && isRally) {
                                    isRally = false;
                                } else if (dataValue > lastHigh && !isRally) {
                                    isRally = true;
                                }
                                //else isRally remains unchanged
                            }

                            // Setting in data for the plot
                            dataObj.isRally = isRally;
                            // To check for having horizontal shift or not,
                            // we need to use the pertinent value
                            if ((isMovingUp && dataValue < lastPlotValue) ||
                                (!isMovingUp && dataValue > lastPlotValue)) {
                                plotValue = lastPlotValue;
                            }
                            // To find if there is a horizontal shift associated
                            // with this plot
                            checkValue = (plotValue) ? plotValue : dataValue;
                            valueDifference = mathAbs(checkValue - nextDataValue);
                            //if the line is static till now
                            if (isMovingUp == null) {
                                isShift = null;
                                //if the line is rising
                            } else if (isMovingUp) {
                                isShift = (checkValue > nextDataValue &&
                                    valueDifference >= reversalValue);
                                //else if the line is falling
                            } else {
                                isShift = (checkValue < nextDataValue &&
                                    valueDifference >= reversalValue);
                            }

                            //To get the last extremes preceding the current point
                            //and setting the vertical/horizontal
                            //alignment of the value to be shown for it.
                            if (prevDataObj && prevDataObj.isShift) {
                                if (isMovingUp) {
                                    lastLow = lastPlotValue;
                                    vAlign = POSITION_BOTTOM;
                                } else if (!isMovingUp) {
                                    lastHigh = lastPlotValue;
                                    vAlign = POSITION_TOP;
                                }
                                align = 'center';
                                //looping to get the actual plot corresponding to the
                                //maxima/minima and setting label properties for the same
                                for (t = index; t > 1; t -= 1) {
                                    if (hcData[t].y == lastPlotValue) {
                                        hcData[t].vAlign = vAlign;
                                        hcData[t].align = align;
                                        hcData[t].showLabel = true;
                                        //extreme obtained and thus stop looping
                                        break;
                                    }
                                }
                            }
                            //if there is a horizontal shift, then
                            if (isShift) {
                                //updating counter to have to total number of horizontal
                                // shifts in the total plot.This is vital for calculation
                                //of the length of each horizontal shifts.
                                shiftCounter += 1;
                                vLinePosition += 0.5;
                                lastShift = true;
                                //updating the flag by reversing the boolean
                                // value of the flag itself
                                isMovingUp = !isMovingUp;
                                //setting in data for the plot, to be used for
                                //drawing the graph
                                dataObj.isShift = true;
                                //updating last plotting value
                                lastPlotValue = checkValue;

                                // we check showLabel in individual data
                                showLabel = pluckNumber(fcDataObj.showlabel,
                                    FCChartObj.showlabels, 1);

                                // Label of the data
                                dataLabel = parseUnsafeString(!showLabel ? BLANK :
                                    getFirstValue(fcDataObj.label, fcDataObj.name));

                                // increase category counter by one
                                axisGridManager.addXaxisCat(xAxisObj, shiftCounter - 1,
                                    shiftCounter - 1, dataLabel);

                            } else if ((isMovingUp && dataValue > lastPlotValue) ||
                                (!isMovingUp && dataValue < lastPlotValue)) {
                                //updating last plotting value
                                lastPlotValue = dataValue;
                                //if cuurent data value is to be skipped for plotting
                            } else {
                                //setting the value to be plotted
                                //(virtually drawing pen stays still due to this)
                                plotValue = lastPlotValue;
                            }
                            //plotValue assigned is either defined or set to null
                            dataObj.plotValue = plotValue;
                            //few local variables are bundled together in an object to be
                            //used later-on to work around a Catch-22 problem
                            dataObj.objParams = {
                                isRally: isRally,
                                lastHigh: lastHigh,
                                lastLow: lastLow,
                                isRallyInitialised: isRallyInitialised
                            };
                        }
                        index += 1;
                    }

                    // Special handling for the dataLabel of the last data-point
                    showLabel = pluckNumber(lastFcDataObj.showlabel,
                        FCChartObj.showlabels, 1);
                    dataLabel = parseUnsafeString(!showLabel ? BLANK :
                        getFirstValue(lastFcDataObj.label, lastFcDataObj.name));
                    axisGridManager.addXaxisCat(xAxisObj, shiftCounter,
                        shiftCounter, dataLabel);

                    series.shiftCount = xAxisConf.catCount = shiftCounter + 1;
                }
            },

            xAxisMinMaxSetter: function(hcJSON, fcJSON, canvasWidth) {
                var conf = hcJSON[CONFIGKEY],
                    xAxisConf = conf.x,
                    /** @todo always set the min and max for the xAsis.
             no catCount is requierd. */
                    FCChartObj = fcJSON.chart,
                    min = xAxisConf.min = pluckNumber(xAxisConf.min, 0),
                    max = xAxisConf.max = pluckNumber(xAxisConf.max,
                        xAxisConf.catCount - 1),
                    leftValuePad = 0,
                    rightValuePad = 0,
                    valuePixelRatio,
                    xAxis = hcJSON.xAxis,
                    //plot area will not be less then 10 px
                    leftPixelPad = mathMin(pluckNumber(FCChartObj.canvaspadding, 0), (canvasWidth / 2) - 10),
                    rightPixelPad = leftPixelPad,
                    // The maximum horizontal shift in percentage of the
                    // available canvas width
                    maxHShiftPercent = pluckNumber(FCChartObj.maxhshiftpercent, 10),
                    series = hcJSON.series[0],
                    shiftCount = series && series.shiftCount,
                    canvasPadding = pluckNumber(FCChartObj.canvaspadding,
                        this.canvasPadding, 15),
                    effectiveCanvasWidth = canvasWidth - canvasPadding * 2,
                    xShiftLength;

                if (series) {
                    // maxHShiftPercent can not be < 0
                    maxHShiftPercent = maxHShiftPercent <= 0 ?
                        10 : maxHShiftPercent;
                    xShiftLength = series.xShiftLength =
                        mathMin(effectiveCanvasWidth / shiftCount,
                            maxHShiftPercent * effectiveCanvasWidth / 100);
                    leftPixelPad = canvasPadding + xShiftLength / 2;
                    rightPixelPad = canvasWidth - ((xShiftLength *
                        // handling single value rendering issue in Kagi
                        mathMax((shiftCount - 1), 1)) + leftPixelPad);
                    // Fix for Kagi chart single value rendering issue
                    // If there is a single value, we use xAxis max value
                    // as 1 not as 0
                    max = mathMax(max, 1);
                }

                //remove all grid related conf
                xAxis.labels.enabled = false;
                xAxis.gridLineWidth = INT_ZERO;
                xAxis.alternateGridColor = COLOR_TRANSPARENT;

                valuePixelRatio = (canvasWidth - (leftPixelPad + rightPixelPad)) /
                    ((max - min) + (leftValuePad + rightValuePad));
                xAxis.min = min - (leftValuePad + (leftPixelPad / valuePixelRatio));
                xAxis.max = max + (rightValuePad + (rightPixelPad / valuePixelRatio));
            }

        }, chartAPI.linebase);

        // boxAndWhisker statistical Methods
        BoxAndWhiskerStatisticalCalc = function(method, numberFormatter, dataSeparator) {
            this.nf = numberFormatter;
            this.dataSeparator = dataSeparator;
            this.method = (method || BLANK).toLowerCase().replace(/\s/g, '');
        };

        BoxAndWhiskerStatisticalCalc.prototype = {
            setArray: function(value) {
                var nf = this.nf,
                    dataSeparator = this.dataSeparator,
                    sum = 0,
                    len,
                    dataArr;
                !value && (value = BLANK);
                // First we make an arry form the comma-separated value.
                // and then we sort and store the data array in dataArr
                //  for further calculation.
                dataArr = value.replace(/\s/g, BLANK).split(dataSeparator);
                // Parse the values using NumberFormatter getCleanValue
                len = this.dataLength = dataArr && dataArr.length;

                while (len--) {
                    sum += dataArr[len] = nf.getCleanValue(dataArr[len]);
                }

                // Now sort the data in ascending order
                dataArr && dataArr.sort(function(a, b) {
                    return a - b;
                });

                this.values = dataArr;
                // Calculate and store the Mean
                this.mean = sum / this.dataLength;
                this.getFrequencies();
            },

            getQuartiles: function() {
                var values = this.values,
                    len = this.dataLength,
                    isOdd = len % 2,
                    q1Pos,
                    q1LowPos,
                    q3Pos,
                    q3LowPos,
                    q1Val,
                    q3Val;

                switch (this.method) {
                case 'tukey':
                    if (isOdd) {
                        // Q1 = n + 3 / 4 And Q3 = 3N + 1 / 4
                        q1Pos = (len + 3) / 4;
                        q3Pos = ((len * 3) + 1) / 4;
                    } else {
                        // Q1 = n + 2 / 4 And Q3 = 3N + 2 / 4
                        q1Pos = (len + 2) / 4;
                        q3Pos = ((len * 3) + 2) / 4;
                    }
                    break;
                case 'mooremccabe':
                    if (isOdd) {
                        // Q1 = n + 1 / 4 And Q3 = 3N + 3 / 4
                        q1Pos = (len + 1) / 4;
                        q3Pos = q1Pos * 3;
                    } else {
                        // Q1 = n + 2 / 4 And Q3 = 3N + 2 / 4
                        q1Pos = (len + 2) / 4;
                        q3Pos = ((len * 3) + 2) / 4;
                    }
                    break;
                case 'freundperles':
                    // Q1 = n + 3 / 4 And Q3 = 3N + 1 / 4
                    q1Pos = (len + 3) / 4;
                    q3Pos = ((len * 3) + 1) / 4;
                    break;
                case 'mendenhallsincich':
                    // Q1 = [n + 1 / 4] And [Q3 = 3N + 3 / 4]
                    q1Pos = mathRound((len + 1) / 4);
                    q3Pos = mathRound(q1Pos * 3);
                    break;
                default:
                    // Q1 = n + 1 / 4 And Q3 = 3N + 3 / 4
                    q1Pos = (len + 1) / 4;
                    q3Pos = q1Pos * 3;
                    break;
                }

                q1Pos -= 1;
                q3Pos -= 1;
                q1LowPos = mathFloor(q1Pos);
                q3LowPos = mathFloor(q3Pos);

                q1Val = q1Pos - q1LowPos ? values[q1LowPos] +
                    ((values[mathCeil(q1Pos)] - values[q1LowPos]) *
                    (q1Pos - q1LowPos)) : values[q1Pos];
                q3Val = q3Pos - q3LowPos ? values[q3LowPos] +
                    ((values[mathCeil(q3Pos)] - values[q3LowPos]) *
                    (q3Pos - q3LowPos)) : values[q3Pos];

                return this.quartiles = {
                    q1: q1Val,
                    q3: q3Val
                };
            },

            // return min and max values from the data array.
            getMinMax: function() {
                var values = this.values;
                return {
                    min: values[0],
                    max: values[this.dataLength - 1]
                };
            },

            // calculate and returns the mean value
            getMean: function() {
                return this.mean;
            },

            // calculate the MeanDeviation
            getMD: function() {
                var mean = this.mean,
                    freq = this.frequencies,
                    freqLen = freq.length,
                    freqObj,
                    sum = 0;

                while (freqLen--) {
                    freqObj = freq[freqLen];
                    sum += freqObj.frequency * mathAbs(freqObj.value - mean);
                }
                return sum / this.dataLength;
            },

            // calculate the standard deviation
            getSD: function() {
                var mean = this.mean,
                    values = this.values,
                    i = this.dataLength,
                    len = i,
                    sum = 0;

                while (i--) {
                    sum += mathPow(values[i] - mean, 2);
                }

                return mathSqrt(sum) / len;
            },

            // calculate the quartile deviation
            getQD: function() {
                return (this.quartiles.q3 - this.quartiles.q1) * 0.5;
            },

            // calculate the frequencies and sum of the values
            getFrequencies: function() {
                var frequenciesArr = [],
                    len = this.dataLength,
                    values = this.values,
                    sum = 0,
                    value,
                    freqObj,
                    index;

                for (index = 0; index < len; index += 1) {
                    sum += value = values[index];
                    if (defined(frequenciesArr[index])) {
                        frequenciesArr[index].frequency += 1;
                    } else {
                        freqObj = {};
                        freqObj.value = value;
                        freqObj.frequency = 1;
                        frequenciesArr[index] = freqObj;
                    }
                }
                this.sum = sum;
                this.frequencies = frequenciesArr;
            },

            getMedian: function() {
                var len = this.dataLength,
                    midVal = len * 0.5,
                    values = this.values;

                return len % 2 === 0 ? (values[midVal] + values[midVal - 1]) / 2 :
                    values[mathFloor(midVal)];
            }
        };

        BoxAndWhiskerStatisticalCalc.prototype.constructor = BoxAndWhiskerStatisticalCalc;

        /******************************************************************************
         * Raphael Renderer Extension
         ******************************************************************************/

        /* BoxAndWhisker2D */
        chartAPI('boxandwhisker2d', {
            friendlyName: 'Box and Whisker Chart',
            standaloneInit: true,
            creditLabel: creditLabel,
            defaultSeriesType: 'boxandwhisker2d',
            chart: chartAPI.errorbar2d.chart,
            drawErrorValue: chartAPI.errorbar2d.drawErrorValue,
            decimals: 2,
            maxColWidth: 9000,
            useErrorAnimation: 1,
            avoidCrispError: 0,
            tooltipsepchar: ': ',
            rendererId: 'boxandwhisker',
            fireGroupEvent: true,

            point: function(chartName, series, dataset, FCChartObj, HCObj,
                catLength, seriesIndex, MSStackIndex, columnPosition) {
                var conf = HCObj[CONFIGKEY],
                    ignoreEmptyDatasets = pluckNumber(FCChartObj.ignoreemptydatasets, 0),
                    NumberFormatter = conf.numberFormatter,
                    // whether to use round edges or not in the column
                    isRoundEdges = HCObj.chart.useRoundEdges,
                    showShadow = pluckNumber(FCChartObj.showshadow, 1),
                    colorM = this.colorManager,
                    plotGradientColor = COMMA + (pluckNumber(
                            FCChartObj.useplotgradientcolor, 0) ? getDefinedColor(
                            FCChartObj.plotgradientcolor,
                            colorM.getColor('plotGradientColor')) :
                        BLANK),
                    colorIndex = seriesIndex * 2,

                    defPlotBorderThickness = pluckNumber(
                        FCChartObj.plotborderthickness, 1),
                    defPlotBorderColor = pluck(FCChartObj.plotbordercolor,
                        colorM.getColor('plotBorderColor'))
                        .split(COMMA)[0],
                    borderAlphaDef = pluck(FCChartObj.plotborderalpha,
                        HUNDRED),
                    defPlotBorderAlpha = FCChartObj.showplotborder == ZERO ?
                        ZERO : borderAlphaDef,
                    defPlotBorderDashed = pluckNumber(dataset.dashed,
                        FCChartObj.plotborderdashed, 0),
                    defPlotBorderDashLen = pluckNumber(dataset.dashlen,
                        FCChartObj.plotborderdashlen, 5),
                    defPlotBorderDashGap = pluckNumber(dataset.dashgap,
                        FCChartObj.plotborderdashgap, 4),

                    upperBoxColorDef = pluck(dataset.upperboxcolor,
                        FCChartObj.upperboxcolor, colorM.getPlotColor(colorIndex)),
                    lowerBoxColorDef = pluck(dataset.lowerboxcolor,
                        FCChartObj.lowerboxcolor, colorM.getPlotColor(colorIndex + 1)),
                    upperBoxAlphaDef = pluckNumber(dataset.upperboxalpha,
                        FCChartObj.upperboxalpha),
                    lowerBoxAlphaDef = pluckNumber(dataset.lowerboxalpha,
                        FCChartObj.lowerboxalpha),

                    upperWhiskerColor = pluck(dataset.upperwhiskercolor,
                        FCChartObj.upperwhiskercolor, defPlotBorderColor),
                    lowerWhiskerColor = pluck(dataset.lowerwhiskercolor,
                        FCChartObj.lowerwhiskercolor, defPlotBorderColor),
                    upperWhiskerAlpha = pluckNumber(dataset.upperwhiskeralpha,
                        FCChartObj.upperwhiskeralpha, FCChartObj.plotborderalpha,
                        HUNDRED),
                    lowerWhiskerAlpha = pluckNumber(dataset.lowerwhiskeralpha,
                        FCChartObj.lowerwhiskeralpha, FCChartObj.plotborderalpha,
                        HUNDRED),
                    upperWhiskerThickness = pluckNumber(
                        dataset.upperwhiskerthickness,
                        FCChartObj.upperwhiskerthickness, defPlotBorderThickness),
                    lowerWhiskerThickness = pluckNumber(
                        dataset.lowerwhiskerthickness,
                        FCChartObj.lowerwhiskerthickness, defPlotBorderThickness),
                    upperWhiskerDashed = pluck(dataset.upperwhiskerdashed,
                        FCChartObj.upperwhiskerdashed, 0),
                    lowerWhiskerDashed = pluck(dataset.lowerwhiskerdashed,
                        FCChartObj.lowerwhiskerdashed, 0),
                    upperWhiskerDashLen = pluck(dataset.upperwhiskerdashlen,
                        FCChartObj.upperwhiskerdashlen, 5),
                    lowerWhiskerDashLen = pluck(dataset.lowerwhiskerdashlen,
                        FCChartObj.lowerwhiskerdashlen, 5),
                    upperWhiskerDashGap = pluck(dataset.upperwhiskerdashgap,
                        FCChartObj.upperwhiskerdashgap, 4),
                    lowerWhiskerDashGap = pluck(dataset.lowerwhiskerdashgap,
                        FCChartObj.lowerwhiskerdashgap, 4),

                    upperQuartileColor = pluck(dataset.upperquartilecolor,
                        FCChartObj.upperquartilecolor, defPlotBorderColor),
                    lowerQuartileColor = pluck(dataset.lowerquartilecolor,
                        FCChartObj.lowerquartilecolor, defPlotBorderColor),
                    upperBoxBorderColor = pluck(dataset.upperboxbordercolor,
                        FCChartObj.upperboxbordercolor, defPlotBorderColor),
                    lowerBoxBorderColor = pluck(dataset.lowerboxbordercolor,
                        FCChartObj.lowerboxbordercolor, defPlotBorderColor),
                    medianColor = pluck(dataset.mediancolor,
                        FCChartObj.mediancolor, defPlotBorderColor),

                    upperQuartileAlpha = pluck(dataset.upperquartilealpha,
                        FCChartObj.upperquartilealpha, isRoundEdges ? 0 :
                        borderAlphaDef),
                    lowerQuartileAlpha = pluck(dataset.lowerquartilealpha,
                        FCChartObj.lowerquartilealpha, isRoundEdges ? 0 :
                        borderAlphaDef),
                    upperBoxBorderAlpha = pluck(dataset.upperboxborderalpha,
                        FCChartObj.upperboxborderalpha, isRoundEdges ? 0 :
                        defPlotBorderAlpha),
                    lowerBoxBorderAlpha = pluck(dataset.lowerboxborderalpha,
                        FCChartObj.lowerboxborderalpha, isRoundEdges ? 0 :
                        defPlotBorderAlpha),
                    medianAlpha = pluck(dataset.medianalpha,
                        FCChartObj.medianalpha, borderAlphaDef),

                    upperQuartileThickness = pluck(dataset.upperquartilethickness,
                        FCChartObj.upperquartilethickness, defPlotBorderThickness),
                    lowerQuartileThickness = pluck(dataset.lowerquartilethickness,
                        FCChartObj.lowerquartilethickness, defPlotBorderThickness),
                    upperBoxBorderThickness = pluck(dataset.upperboxborderthickness,
                        FCChartObj.upperboxborderthickness, defPlotBorderThickness),
                    lowerBoxBorderThickness = pluck(dataset.lowerboxborderthickness,
                        FCChartObj.lowerboxborderthickness, defPlotBorderThickness),
                    medianThickness = pluck(dataset.medianthickness,
                        FCChartObj.medianthickness, defPlotBorderThickness),

                    // Following new attributes added to manage dashed style
                    upperQuartileDashed = pluck(dataset.upperquartiledashed,
                        FCChartObj.upperquartiledashed, defPlotBorderDashed),
                    lowerQuartileDashed = pluck(dataset.lowerquartiledashed,
                        FCChartObj.lowerquartiledashed, defPlotBorderDashed),
                    upperBoxBorderDashed = pluck(dataset.upperboxborderdashed,
                        FCChartObj.upperboxborderdashed, defPlotBorderDashed),
                    lowerBoxBorderDashed = pluck(dataset.lowerboxborderdashed,
                        FCChartObj.lowerboxborderdashed, defPlotBorderDashed),
                    medianDashed = pluck(dataset.mediandashed,
                        FCChartObj.mediandashed, defPlotBorderDashed),

                    upperQuartileDashLen = pluck(dataset.upperquartiledashlen,
                        FCChartObj.upperquartiledashlen, defPlotBorderDashLen),
                    lowerQuartileDashLen = pluck(dataset.lowerquartiledashlen,
                        FCChartObj.lowerquartiledashlen, defPlotBorderDashLen),
                    upperBoxBorderDashLen = pluck(dataset.upperboxborderdashlen,
                        FCChartObj.upperboxborderdashlen, defPlotBorderDashLen),
                    lowerBoxBorderDashLen = pluck(dataset.lowerboxborderdashlen,
                        FCChartObj.lowerboxborderdashlen, defPlotBorderDashLen),
                    medianDashLen = pluck(dataset.mediandashlen,
                        FCChartObj.mediandashlen, defPlotBorderDashLen),

                    upperQuartileDashGap = pluck(dataset.upperquartiledashgap,
                        FCChartObj.upperquartiledashgap, defPlotBorderDashGap),
                    lowerQuartileDashGap = pluck(dataset.lowerquartiledashgap,
                        FCChartObj.lowerquartiledashgap, defPlotBorderDashGap),
                    upperBoxBorderDashGap = pluck(dataset.upperboxborderdashgap,
                        FCChartObj.upperboxborderdashgap, defPlotBorderDashGap),
                    lowerBoxBorderDashGap = pluck(dataset.lowerboxborderdashgap,
                        FCChartObj.lowerboxborderdashgap, defPlotBorderDashGap),
                    medianDashGap = pluck(dataset.mediandashgap,
                        FCChartObj.mediandashgap, defPlotBorderDashGap),

                    upperQuartile = {},
                    lowerQuartile = {},
                    upperBoxBorder = {},
                    lowerBoxBorder = {},
                    median = {},

                    // Mean Configuration
                    meanArr = [],
                    // Mean deviation
                    MDArr = [],
                    // Standard deviation
                    SDArr = [],
                    // Quartile deviation
                    QDArr = [],
                    // Outliers
                    outliersArr = [],

                    POLYGON = 'polygon',
                    SPOKE = 'spoke',
                    iconShape = {
                        polygon: POLYGON,
                        spoke: SPOKE
                    },
                    // MEAN ICONS
                    meanIconShape = iconShape[pluck(dataset.meaniconshape,
                        FCChartObj.meaniconshape, POLYGON).toLowerCase()] ||
                        POLYGON,
                    meanIconRadius = pluckNumber(dataset.meaniconradius,
                        FCChartObj.meaniconradius, 5),
                    meanIconSides = pluckNumber(dataset.meaniconsides,
                        FCChartObj.meaniconsides, 3),
                    meanIconColor = pluck(dataset.meaniconcolor,
                        FCChartObj.meaniconcolor, '000000'),
                    meanIconBorderColor = pluck(dataset.meaniconbordercolor,
                        FCChartObj.meaniconbordercolor, '000000'),
                    meanIconAlpha = pluckNumber(dataset.meaniconalpha,
                        FCChartObj.meaniconalpha, 100),
                    // SD ICONS
                    sdIconShape = iconShape[pluck(dataset.sdiconshape,
                        FCChartObj.sdiconshape, POLYGON).toLowerCase()] ||
                        POLYGON,
                    sdIconRadius = pluckNumber(dataset.sdiconradius,
                        FCChartObj.sdiconradius, 5),
                    sdIconSides = pluckNumber(dataset.sdiconsides,
                        FCChartObj.sdiconsides, 3),
                    sdIconColor = pluck(dataset.sdiconcolor,
                        FCChartObj.sdiconcolor, '000000'),
                    sdIconBorderColor = pluck(dataset.sdiconbordercolor,
                        FCChartObj.sdiconbordercolor, '000000'),
                    sdIconAlpha = pluckNumber(dataset.sdiconalpha,
                        FCChartObj.sdiconalpha, 100),
                    // MD ICONS
                    mdIconShape = iconShape[pluck(dataset.mdiconshape,
                        FCChartObj.mdiconshape, POLYGON).toLowerCase()] ||
                        POLYGON,
                    mdIconRadius = pluckNumber(dataset.mdiconradius,
                        FCChartObj.mdiconradius, 5),
                    mdIconSides = pluckNumber(dataset.mdiconsides,
                        FCChartObj.mdiconsides, 3),
                    mdIconColor = pluck(dataset.mdiconcolor,
                        FCChartObj.mdiconcolor, '000000'),
                    mdIconBorderColor = pluck(dataset.mdiconbordercolor,
                        FCChartObj.mdiconbordercolor, '000000'),
                    mdIconAlpha = pluckNumber(dataset.mdiconalpha,
                        FCChartObj.mdiconalpha, 100),
                    // QD ICONS
                    qdIconShape = iconShape[pluck(dataset.qdiconshape,
                        FCChartObj.qdiconshape, POLYGON).toLowerCase()] ||
                        POLYGON,
                    qdIconRadius = pluckNumber(dataset.qdiconradius,
                        FCChartObj.qdiconradius, 5),
                    qdIconSides = pluckNumber(dataset.qdiconsides,
                        FCChartObj.qdiconsides, 3),
                    qdIconColor = pluck(dataset.qdiconcolor,
                        FCChartObj.qdiconcolor, '000000'),
                    qdIconBorderColor = pluck(dataset.qdiconbordercolor,
                        FCChartObj.qdiconbordercolor, '000000'),
                    qdIconAlpha = pluckNumber(dataset.qdiconalpha,
                        FCChartObj.qdiconalpha, 100),
                    // QD ICONS
                    outlierIconShape = iconShape[pluck(dataset.outliericonshape,
                        FCChartObj.outliericonshape, POLYGON).toLowerCase()] ||
                        POLYGON,
                    outlierIconRadius = pluckNumber(dataset.outliericonradius,
                        FCChartObj.outliericonradius, 5),
                    outlierIconSides = pluckNumber(dataset.outliericonsides,
                        FCChartObj.outliericonsides, 3),
                    outlierIconColor = pluck(dataset.outliericoncolor,
                        FCChartObj.outliericoncolor, '000000'),
                    outlierIconBorderColor = pluck(dataset.outliericonbordercolor,
                        FCChartObj.outliericonbordercolor, '000000'),
                    outlierIconAlpha = pluckNumber(dataset.outliericonalpha,
                        FCChartObj.outliericonalpha, 100),

                    datasetLen = 2 - 1,
                    plotSpacePercent = conf.plotSpacePercent * 2,
                    perSeriesLen = (1 - plotSpacePercent) / 2,
                    pointStart = ((datasetLen * -0.5) + seriesIndex) *
                        perSeriesLen,
                    reverseLegend = pluckNumber(FCChartObj.reverselegend, 0),
                    legendIndexInc = reverseLegend ? -1 : 1,
                    legendIndex = series.legendIndex = (seriesIndex * 6) +
                        (reverseLegend ? 6 - 1 : 0),
                    showMeanDef = pluckNumber(dataset.showmean, FCChartObj.showmean,
                        0),
                    showMDDef = pluckNumber(dataset.showmd, FCChartObj.showmd, 0),
                    showSDDef = pluckNumber(dataset.showsd, FCChartObj.showsd, 0),
                    showQDDef = pluckNumber(dataset.showqd, FCChartObj.showqd, 0),
                    showAllOutliers = pluckNumber(dataset.showalloutliers,
                        FCChartObj.showalloutliers, 0),
                    outliersUpperRangeRatio =
                        pluckNumber(FCChartObj.outliersupperrangeratio, 0),
                    outliersLowerRangeRatio =
                        pluckNumber(FCChartObj.outlierslowerrangeratio, 0),
                    hasValidPoint = false,
                    showDetailedLegend = Boolean(pluckNumber(
                        FCChartObj.showdetailedlegend, 1)),
                    tooltipSepChar = conf.tooltipSepChar,
                    showInLegend = true,
                    dataSeparator = conf.dataSeparator,
                    bwCalc = conf.bwCalc,
                    // take the series type
                    seriesType = pluck(series.type, this.defaultSeriesType),
                    // Check the chart is a stacked chart or not
                    isStacked = HCObj.plotOptions[seriesType] &&
                        HCObj.plotOptions[seriesType].stacking,
                    hoverEffects,
                    label,
                    diffrence,
                    showMean,
                    showMD,
                    showSD,
                    showQD,
                    hasValidMean,
                    hasValidMD,
                    hasValidSD,
                    hasValidQD,
                    iconAlpha,
                    mean,
                    sd,
                    md,
                    qd,

                    upperSeriesColor,
                    lowerSeriesColor,
                    outliersDataArr,
                    outliersDataLen,
                    ind,
                    outlierVal,
                    itemValue,
                    highValue,
                    lowValue,
                    index,
                    upperBoxColor,
                    lowerBoxColor,
                    upperBoxAlpha,
                    lowerBoxAlpha,

                    dataObj,
                    setRatio,
                    setAngle,
                    isBar,
                    is3d,
                    upperboxColorArr,
                    lowerboxColorArr,
                    pointStub,
                    toolText,
                    pointShadow,
                    plotBorderAlpha,
                    data,
                    max,
                    min,
                    medianValue,
                    quartile,
                    q1,
                    q3,
                    limits,
                    sortDecFN = function(a, b) {
                        return a - b;
                    },
                    errorValueArr,
                    meanSeries,
                    sdSeries,
                    mdSeries,
                    qdSeries,
                    outliersSeries;

                // Error Bar Attributes
                series.errorBarWidthPercent = pluckNumber(
                    dataset.whiskerslimitswidthratio,
                    FCChartObj.whiskerslimitswidthratio, 40);

                // We proceed if there is data inside dataset object
                data = dataset.data;

                // Dataset seriesname
                series.name = getValidValue(dataset.seriesname);

                //add column position
                if (!isStacked) {
                    series.columnPosition = pluckNumber(columnPosition, MSStackIndex, seriesIndex);
                }

                /** @todo not sure about the proper place to store this */
                series.errorBar2D = true;

                // If includeInLegend set to false
                // We set series.name blank
                if (pluckNumber(dataset.includeinlegend) === 0 ||
                    series.name === undefined) {
                    showInLegend = series.showInLegend = false;
                }

                // If icon sides < 3 we use sides as 5
                if (meanIconSides < 3) {
                    meanIconSides = 3;
                }

                // Color of the individual series
                upperSeriesColor = parseColor(upperBoxColorDef.split(
                    COMMA)[0]);
                lowerSeriesColor = parseColor(lowerBoxColorDef.split(
                    COMMA)[0]);
                series.color = {
                    FCcolor: {
                        color: upperSeriesColor + COMMA +
                            upperSeriesColor + COMMA +
                            lowerSeriesColor + COMMA +
                            lowerSeriesColor,
                        alpha: '100,100,100,100',
                        angle: 90,
                        ratio: '0,50,0,50'
                    }
                };

                // is3d and isBar helps to get the column color by
                // getColumnColor function
                // whether the chart is a 3D or Bar
                isBar = this.isBar;
                is3d = /3d$/.test(HCObj.chart.defaultSeriesType);

                // Managing plot border color for 3D column chart
                // 3D column chart doesn't show the plotborder by default
                // until we set showplotborder true
                defPlotBorderAlpha = is3d ? (FCChartObj.showplotborder ?
                    defPlotBorderAlpha : ZERO) : defPlotBorderAlpha;

                // Default  plotBorderColor  is FFFFFF for this 3d chart
                defPlotBorderColor = is3d ? pluck(FCChartObj.plotbordercolor,
                    '#FFFFFF') : defPlotBorderColor;

                // Validation of outliersUpperRangeRatio
                outliersUpperRangeRatio = (outliersUpperRangeRatio < 0) ?
                    0 : outliersUpperRangeRatio;
                // Validation of outliersLowerRangeRatio
                outliersLowerRangeRatio = (outliersLowerRangeRatio < 0) ?
                    0 : outliersLowerRangeRatio;

                // Iterate through all level data
                // We are managing the data value labels and other
                // cosmetics inside this loop
                for (index = 0; index < catLength; index += 1) {

                    // Individual data object
                    if ((dataObj = data && data[index])) {
                        bwCalc.setArray(dataObj.value);
                        quartile = bwCalc.getQuartiles();
                        q1 = quartile.q1;
                        q3 = quartile.q3;

                        limits = bwCalc.getMinMax();
                        min = lowValue = limits.min;
                        max = limits.max;
                        medianValue = bwCalc.getMedian();
                        mean = bwCalc.getMean();
                        md = bwCalc.getMD();
                        sd = bwCalc.getSD();
                        qd = bwCalc.getQD();

                        // get the valid value
                        highValue = itemValue = max;
                    }

                    if (!dataObj || q1 == null || q3 == null || itemValue === null) {
                        // add the null data
                        series.data.push({
                            y: null
                        });
                        MDArr.push({
                            y: null
                        });
                        SDArr.push({
                            y: null
                        });
                        QDArr.push({
                            y: null
                        });
                        meanArr.push({
                            y: null
                        });
                        continue;
                    }

                    hasValidPoint = true;

                    showMean = pluckNumber(dataObj.showmean, showMeanDef);
                    showMD = pluckNumber(dataObj.showmd, showMDDef);
                    showSD = pluckNumber(dataObj.showsd, showSDDef);
                    showQD = pluckNumber(dataObj.showqd, showQDDef);

                    label = conf.oriCatTmp[index];
                    pointStub = this.getPointStub(HCObj, FCChartObj,
                        dataset, dataObj, max, q3, medianValue,
                        q1, min, mean, md, sd, qd, label);
                    toolText = pointStub.toolText;

                    if (showMean) {
                        hasValidMean = 1;
                        iconAlpha = pluckNumber(dataObj.meaniconalpha,
                            meanIconAlpha);
                        toolText = getValidValue(parseUnsafeString(pluck(
                            dataObj.meantooltext, dataset.meantooltext,
                            FCChartObj.meantooltext)));

                        if (toolText !== undefined) {
                            toolText = this.getTooltext(toolText, HCObj, FCChartObj,
                                dataset, dataObj, max, min, q1, q3, median, sd, qd,
                                md, mean, label);
                        } else {
                            toolText = '<b>Mean' + tooltipSepChar + '</b>' +
                                NumberFormatter.dataLabels(mean);
                        }

                        meanArr.push({
                            y: mean,
                            toolText: toolText,
                            link: pointStub.link,
                            marker: {
                                enabled: true,
                                fillColor: convertColor(pluck(
                                        dataObj.meaniconcolor, meanIconColor),
                                    iconAlpha),
                                lineColor: convertColor(pluck(
                                    dataObj.meaniconbordercolor,
                                    meanIconBorderColor), iconAlpha),
                                radius: pluckNumber(dataObj.meaniconradius,
                                    meanIconRadius),
                                symbol: mapSymbolName(
                                    pluckNumber(dataObj.meaniconsides,
                                        meanIconSides), pluck(
                                        dataObj.meaniconshape,
                                        meanIconShape) == SPOKE)
                            }
                        });
                    } else {
                        meanArr.push({
                            y: null
                        });
                    }

                    if (showMD) {
                        hasValidMD = 1;
                        iconAlpha = pluckNumber(dataObj.mdiconalpha,
                            mdIconAlpha);
                        toolText = getValidValue(parseUnsafeString(pluck(
                            dataObj.mdtooltext, dataset.mdtooltext, FCChartObj.mdtooltext)));

                        if (toolText !== undefined) {
                            toolText = this.getTooltext(toolText, HCObj, FCChartObj,
                                dataset, dataObj, max, min, q1, q3, median, sd, qd,
                                md, mean, label);
                        } else {
                            toolText = '<b>MD' + tooltipSepChar + '</b>' +
                                NumberFormatter.dataLabels(md);
                        }

                        MDArr.push({
                            y: md,
                            toolText: toolText,
                            link: pointStub.link,
                            marker: {
                                enabled: true,
                                fillColor: convertColor(pluck(
                                        dataObj.mdiconcolor, mdIconColor),
                                    iconAlpha),
                                lineColor: convertColor(pluck(
                                    dataObj.mdiconbordercolor,
                                    sdIconBorderColor), iconAlpha),
                                radius: pluckNumber(dataObj.mdiconradius,
                                    mdIconRadius),
                                symbol: mapSymbolName(
                                    pluckNumber(dataObj.mdiconsides,
                                        mdIconSides), pluck(
                                        dataObj.mdiconshape,
                                        mdIconShape) == SPOKE)
                            }
                        });
                    } else {
                        MDArr.push({
                            y: null
                        });
                    }

                    if (showSD) {
                        hasValidSD = 1;
                        iconAlpha = pluckNumber(dataObj.sdiconalpha,
                            sdIconAlpha);
                        toolText = getValidValue(parseUnsafeString(pluck(
                            dataObj.sdtooltext, dataset.sdtooltext, FCChartObj.sdtooltext)));

                        if (toolText !== undefined) {
                            toolText = this.getTooltext(toolText, HCObj, FCChartObj,
                                dataset, dataObj, max, min, q1, q3, median, sd, qd,
                                md, mean, label);
                        } else {
                            toolText = '<b>SD' + tooltipSepChar + '</b>' +
                                NumberFormatter.dataLabels(sd);
                        }

                        SDArr.push({
                            y: sd,
                            toolText: toolText,
                            link: pointStub.link,
                            marker: {
                                enabled: true,
                                fillColor: convertColor(pluck(
                                    dataObj.sdiconcolor,
                                    sdIconColor), iconAlpha),
                                lineColor: convertColor(pluck(
                                    dataObj.sdiconbordercolor,
                                    sdIconBorderColor), iconAlpha),
                                radius: pluckNumber(dataObj.sdiconradius,
                                    sdIconRadius),
                                symbol: mapSymbolName(
                                    pluckNumber(dataObj.sdiconsides,
                                        sdIconSides), pluck(
                                        dataObj.sdiconshape,
                                        sdIconShape) == SPOKE)
                            }
                        });
                    } else {
                        SDArr.push({
                            y: null
                        });
                    }

                    if (showQD) {
                        hasValidQD = 1;
                        iconAlpha = pluckNumber(dataObj.qdiconalpha,
                            qdIconAlpha);
                        toolText = getValidValue(parseUnsafeString(pluck(
                            dataObj.qdtooltext, dataset.qdtooltext, FCChartObj.qdtooltext)));

                        if (toolText !== undefined) {
                            toolText = this.getTooltext(toolText, HCObj, FCChartObj,
                                dataset, dataObj, max, min, q1, q3, median, sd, qd,
                                md, mean, label);
                        } else {
                            toolText = '<b>QD' + tooltipSepChar + '</b>' +
                                NumberFormatter.dataLabels(qd);
                        }

                        QDArr.push({
                            y: qd,
                            toolText: toolText,
                            link: pointStub.link,
                            marker: {
                                enabled: true,
                                fillColor: convertColor(pluck(dataObj.qdiconcolor,
                                    qdIconColor), iconAlpha),
                                lineColor: convertColor(pluck(
                                    dataObj.qdiconbordercolor,
                                    qdIconBorderColor), iconAlpha),
                                radius: pluckNumber(dataObj.qdiconradius,
                                    qdIconRadius),
                                symbol: mapSymbolName(
                                    pluckNumber(dataObj.qdiconsides,
                                        qdIconSides), pluck(
                                        dataObj.qdiconshape,
                                        qdIconShape) == SPOKE)
                            }
                        });
                    } else {
                        QDArr.push({
                            y: null
                        });
                    }

                    if ((outliersDataArr = dataObj.outliers)) {
                        outliersDataArr = outliersDataArr
                            .replace(/\s/g, BLANK).split(dataSeparator);
                        // Parse the values using NumberFormatter getCleanValue
                        outliersDataLen = outliersDataArr.length;
                        while (outliersDataLen--) {
                            outliersDataArr[outliersDataLen] =
                                NumberFormatter.getCleanValue(outliersDataArr[outliersDataLen]);
                        }
                        outliersDataArr.sort(sortDecFN);
                        outliersDataLen = outliersDataArr.length;

                        for (ind = 0; ind < outliersDataLen; ind += 1) {
                            outlierVal = outliersDataArr[ind];
                            if (showAllOutliers) {
                                highValue = mathMax(itemValue, outlierVal);
                                lowValue = mathMin(min, outlierVal);
                            }
                            iconAlpha = pluckNumber(
                                dataObj.outliericonalpha, outlierIconAlpha);
                            if (outlierVal > itemValue || outlierVal < min) {
                                toolText = getValidValue(parseUnsafeString(pluck(
                                    dataObj.outlierstooltext, dataset.outlierstooltext,
                                    FCChartObj.outlierstooltext)));
                                if (toolText !== undefined) {
                                    toolText = this.getTooltext(toolText, HCObj,
                                        FCChartObj, dataset, dataObj, max, min, q1,
                                        q3, median, sd, qd, md, mean, label, outlierVal);
                                } else {
                                    toolText = '<b>Outlier' + tooltipSepChar + '</b>' +
                                        NumberFormatter.dataLabels(outlierVal);
                                }

                                outliersArr.push({
                                    y: outlierVal,
                                    toolText: toolText,
                                    x: index,
                                    link: pointStub.link,
                                    marker: {
                                        enabled: true,
                                        fillColor: convertColor(pluck(
                                            dataObj.outliericoncolor,
                                            outlierIconColor), iconAlpha),
                                        lineColor: convertColor(pluck(
                                            dataObj.outliericonbordercolor,
                                            outlierIconBorderColor), iconAlpha),
                                        radius: pluckNumber(
                                            dataObj.outliericonradius,
                                            outlierIconRadius),
                                        symbol: mapSymbolName(
                                            pluckNumber(dataObj.outliericonsides,
                                                outlierIconSides), pluck(
                                                dataObj.outliericonshape,
                                                outlierIconShape) == SPOKE)
                                    }
                                });
                            }
                        }
                    }
                    if (!showAllOutliers) {
                        diffrence = highValue - lowValue;
                        highValue += diffrence * outliersUpperRangeRatio;
                        lowValue -= diffrence * outliersLowerRangeRatio;
                    }
                    // Color for the upperBox
                    upperBoxColor = pluck(dataObj.upperboxcolor,
                        upperBoxColorDef) + plotGradientColor;
                    // Color for the lowerBox
                    lowerBoxColor = pluck(dataObj.lowerboxcolor,
                        lowerBoxColorDef) + plotGradientColor;
                    // Alpha of the upperBox
                    upperBoxAlpha = pluck(dataObj.upperboxalpha,
                        upperBoxAlphaDef,
                        FCChartObj.upperboxalpha, FCChartObj.plotfillalpha,
                        HUNDRED) + BLANK;
                    // Alpha of the lowerBox
                    lowerBoxAlpha = pluck(dataObj.lowerboxalpha,
                        lowerBoxAlphaDef,
                        FCChartObj.lowerboxalpha, FCChartObj.plotfillalpha,
                        HUNDRED) + BLANK;
                    setRatio = pluck(dataObj.ratio, dataset.ratio,
                        FCChartObj.plotfillratio);
                    // defaultAngle depend upon item value
                    setAngle = pluck(360 - FCChartObj.plotfillangle, 90);

                    if (itemValue < 0) {
                        setAngle = 360 - setAngle;
                    }
                    // Used to set alpha of the shadow
                    pointShadow = {
                        opacity: upperBoxAlpha / 100
                    };
                    plotBorderAlpha = mathMin(upperBoxAlpha,
                        defPlotBorderAlpha) + BLANK;

                    // Calculate the color object for upperBox
                    upperboxColorArr = getColumnColor(upperBoxColor,
                        upperBoxAlpha, setRatio, setAngle, isRoundEdges,
                        defPlotBorderColor, plotBorderAlpha, isBar, is3d);
                    // calculate the color object for lowerBox
                    lowerboxColorArr = getColumnColor(lowerBoxColor,
                        lowerBoxAlpha, setRatio, setAngle, isRoundEdges,
                        defPlotBorderColor, plotBorderAlpha, isBar, is3d);

                    upperQuartile = {
                        value: q3,
                        color: convertColor(pluck(
                                dataObj.upperquartilecolor, upperQuartileColor),
                            pluckNumber(dataObj.upperquartilealpha,
                                upperQuartileAlpha)),
                        borderWidth: pluckNumber(
                            dataObj.upperquartilethickness,
                            upperQuartileThickness),
                        dashStyle: pluckNumber(dataObj.upperquartiledashed,
                            upperQuartileDashed) ?
                            getDashStyle(pluck(dataObj.upperquartiledashlen,
                                    upperQuartileDashLen),
                                pluck(dataObj.upperquartiledashgap,
                                    upperQuartileDashGap), pluckNumber(
                                    dataObj.upperquartilethickness,
                                    upperQuartileThickness)) : undefined,
                        displayValue: pointStub.displayValueQ3
                    };

                    lowerQuartile = {
                        value: q1,
                        color: convertColor(pluck(
                                dataObj.lowerquartilecolor, lowerQuartileColor),
                            pluckNumber(dataObj.lowerquartilealpha,
                                lowerQuartileAlpha)),
                        borderWidth: pluckNumber(
                            dataObj.lowerquartilethickness,
                            lowerQuartileThickness),
                        dashStyle: pluckNumber(dataObj.lowerquartiledashed,
                            lowerQuartileDashed) ?
                            getDashStyle(pluck(dataObj.lowerquartiledashlen,
                                    lowerQuartileDashLen),
                                pluck(dataObj.lowerquartiledashgap,
                                    lowerQuartileDashGap), pluckNumber(
                                    dataObj.lowerquartilethickness,
                                    lowerQuartileThickness)) : undefined,
                        displayValue: pointStub.displayValueQ1
                    };

                    upperBoxBorder = {
                        color: convertColor(pluck(
                                dataObj.upperboxbordercolor,
                                upperBoxBorderColor),
                            pluckNumber(dataObj.upperboxborderalpha,
                                upperBoxBorderAlpha)),
                        borderWidth: pluckNumber(
                            dataObj.upperboxborderthickness,
                            upperBoxBorderThickness),
                        dashStyle: pluckNumber(dataObj.upperboxborderdashed,
                            upperBoxBorderDashed) ?
                            getDashStyle(pluck(dataObj.upperboxborderdashlen,
                                    upperBoxBorderDashLen),
                                pluck(dataObj.upperboxborderdashgap,
                                    upperBoxBorderDashGap), pluckNumber(
                                    dataObj.upperboxborderthickness,
                                    upperBoxBorderThickness)) : undefined
                    };

                    lowerBoxBorder = {
                        color: convertColor(pluck(
                                dataObj.lowerboxbordercolor,
                                lowerBoxBorderColor),
                            pluckNumber(dataObj.lowerboxborderalpha,
                                lowerBoxBorderAlpha)),
                        borderWidth: pluckNumber(
                            dataObj.lowerboxborderthickness,
                            lowerBoxBorderThickness),
                        dashStyle: pluckNumber(dataObj.lowerboxborderdashed,
                            lowerBoxBorderDashed) ?
                            getDashStyle(pluck(dataObj.lowerboxborderdashlen,
                                    lowerBoxBorderDashLen),
                                pluck(dataObj.lowerboxborderdashgap,
                                    lowerBoxBorderDashGap), pluckNumber(
                                    dataObj.lowerboxborderthickness,
                                    lowerBoxBorderThickness)) : undefined
                    };

                    median = {
                        value: medianValue,
                        color: convertColor(pluck(
                                dataObj.mediancolor, medianColor),
                            pluckNumber(dataObj.medianalpha,
                                medianAlpha)),
                        borderWidth: pluckNumber(
                            dataObj.medianthickness,
                            medianThickness),
                        dashStyle: pluckNumber(dataObj.mediandashed,
                            medianDashed) ?
                            getDashStyle(pluck(dataObj.mediandashlen,
                                    medianDashLen),
                                pluck(dataObj.mediandashgap,
                                    medianDashGap), pluckNumber(
                                    dataObj.medianthickness,
                                    medianThickness)) : undefined,
                        displayValue: pointStub.displayValueMid
                    };

                    errorValueArr = [];
                    defined(max) && errorValueArr.push({
                        errorValue: max - q3,
                        toolText: pointStub.toolText,
                        link: pointStub.link,
                        errorBarColor: convertColor(pluck(
                                dataObj.upperwhiskercolor, upperWhiskerColor),
                            pluckNumber(dataObj.upperwhiskeralpha,
                                upperWhiskerAlpha)),
                        errorBarThickness: pluckNumber(
                            dataObj.upperwhiskerthickness,
                            upperWhiskerThickness),
                        dashStyle: pluckNumber(dataObj.upperwhiskerdashed,
                            upperWhiskerDashed) ?
                            getDashStyle(pluck(dataObj.upperwhiskerdashlen,
                                    upperWhiskerDashLen),
                                pluck(dataObj.upperwhiskerdashgap,
                                    upperWhiskerDashGap), pluckNumber(
                                    dataObj.upperwhiskerthickness,
                                    upperWhiskerThickness)) : undefined,
                        displayValue: pointStub.displayValueMax,
                        // We are making errorBar shadow opacity very low by
                        // dividing it's alpha with 160
                        shadow: {
                            opacity: showShadow ? pluckNumber(
                                dataObj.upperwhiskeralpha, upperWhiskerAlpha) / 250 : 0
                        }
                    });

                    defined(min) && errorValueArr.push({
                        errorValue: -(q1 - min),
                        errorStartValue: q1,
                        toolText: pointStub.toolText,
                        link: pointStub.link,
                        errorBarColor: convertColor(pluck(
                                dataObj.lowerwhiskercolor, lowerWhiskerColor),
                            pluckNumber(dataObj.lowerwhiskeralpha,
                                lowerWhiskerAlpha)),
                        errorBarThickness: pluckNumber(
                            dataObj.lowerwhiskerthickness,
                            lowerWhiskerThickness),
                        dashStyle: pluckNumber(dataObj.lowerwhiskerdashed,
                            lowerWhiskerDashed) ?
                            getDashStyle(pluck(dataObj.lowerwhiskerdashlen,
                                    lowerWhiskerDashLen),
                                pluck(dataObj.lowerwhiskerdashgap,
                                    lowerWhiskerDashGap), pluckNumber(
                                    dataObj.lowerwhiskerthickness,
                                    lowerWhiskerThickness)) : undefined,
                        displayValue: pointStub.displayValueMin,
                        // We are making errorBar shadow opacity very low by
                        // dividing it's alpha with 160
                        shadow: {
                            opacity: showShadow ? pluckNumber(
                                dataObj.lowerwhiskeralpha, lowerWhiskerAlpha) / 250 : 0
                        }
                    });

                    hoverEffects = this.pointHoverOptions(dataObj, dataset, FCChartObj, {
                        upperBoxColor: upperBoxColor,
                        upperBoxAlpha: upperBoxAlpha,
                        upperBoxBorderColor: pluck(dataObj.upperboxbordercolor,
                            upperBoxBorderColor),
                        upperBoxBorderAlpha: pluckNumber(dataObj.upperboxborderalpha,
                            upperBoxBorderAlpha),
                        upperBoxBorderThickness: upperBoxBorder.borderWidth,

                        lowerBoxColor: lowerBoxColor,
                        lowerBoxAlpha: lowerBoxAlpha,
                        lowerBoxBorderColor: pluck(dataObj.lowerboxbordercolor,
                            lowerBoxBorderColor),
                        lowerBoxBorderAlpha: pluckNumber(dataObj.lowerboxborderalpha,
                            lowerBoxBorderAlpha),
                        lowerBoxBorderThickness: lowerBoxBorder.borderWidth,

                        upperQuartileColor: pluck(dataObj.upperquartilecolor,
                            upperQuartileColor),
                        upperQuartileAlpha: pluckNumber(dataObj.upperquartilealpha,
                                upperQuartileAlpha),
                        upperQuartileThickness: upperQuartile.borderWidth,

                        lowerQuartileColor: pluck(dataObj.lowerquartilecolor,
                            lowerQuartileColor),
                        lowerQuartileAlpha: pluckNumber(dataObj.lowerquartilealpha,
                            lowerQuartileAlpha),
                        lowerQuartileThickness: lowerQuartile.borderWidth,

                        upperWhiskerColor: pluck(dataObj.upperwhiskercolor,
                            upperWhiskerColor),
                        upperWhiskerThickness: pluckNumber(dataObj.upperwhiskerthickness,
                            upperWhiskerThickness),
                        upperWhiskerAlpha: pluckNumber(dataObj.upperwhiskeralpha,
                            upperWhiskerAlpha),

                        lowerWhiskerColor: pluck(dataObj.lowerwhiskercolor,
                            lowerWhiskerColor),
                        lowerWhiskerAlpha: pluckNumber(dataObj.lowerwhiskeralpha,
                            lowerWhiskerAlpha),
                        lowerWhiskerThickness: pluckNumber(dataObj.lowerwhiskerthickness,
                            lowerWhiskerThickness),

                        medianColor: pluck(dataObj.mediancolor,
                            medianColor),
                        medianAlpha: pluckNumber(dataObj.medianalpha,
                            medianAlpha),
                        medianThickness: pluckNumber(dataObj.medianthickness,
                            medianThickness)
                    });

                    if (hoverEffects.enabled) {
                        // create the color object for upperBox
                        hoverEffects.upperBox.fill = toRaphaelColor(getColumnColor(hoverEffects.upperBox.color,
                            hoverEffects.upperBox.alpha, setRatio, setAngle, isRoundEdges,
                            defPlotBorderColor, plotBorderAlpha, isBar, is3d)[0].FCcolor);
                        delete hoverEffects.upperBox.color;
                        delete hoverEffects.upperBox.alpha;
                        // create the color object for lowerBox
                        hoverEffects.lowerBox.fill = toRaphaelColor(getColumnColor(hoverEffects.lowerBox.color,
                            hoverEffects.lowerBox.alpha, setRatio, setAngle, isRoundEdges,
                            defPlotBorderColor, plotBorderAlpha, isBar, is3d)[0].FCcolor);
                        delete hoverEffects.lowerBox.color;
                        delete hoverEffects.lowerBox.alpha;
                    }

                    // add the data
                    series.data.push(extend2(pointStub, {
                        y: q3,
                        errorValue: errorValueArr,
                        shadow: pointShadow,
                        color: upperboxColorArr[0],
                        toolText: pointStub.toolText,
                        lowerboxColor: lowerboxColorArr[0],
                        lowerboxBorderColor: lowerboxColorArr[1],
                        borderWidth: 0,
                        upperQuartile: upperQuartile,
                        lowerQuartile: lowerQuartile,
                        upperBoxBorder: upperBoxBorder,
                        lowerBoxBorder: lowerBoxBorder,
                        median: median,
                        hoverEffects: hoverEffects
                    }));

                    // Set the maximum and minimum found in data
                    // pointValueWatcher use to calculate the maximum and
                    // minimum value of the Axis
                    this.pointValueWatcher(HCObj, highValue);
                    this.pointValueWatcher(HCObj, lowValue);

                }

                series.showInLegend = showInLegend && (hasValidPoint || !ignoreEmptyDatasets);
                series.legendFillColor = convertColor(upperSeriesColor, 20);

                meanSeries = {
                    type: 'line',
                    name: 'Mean',
                    relatedSeries: 'boxandwhisker',
                    data: meanArr,
                    legendIndex: legendIndex + (legendIndexInc),
                    showInLegend: !! hasValidMean && showInLegend && showDetailedLegend,
                    marker: {
                        fillColor: convertColor(meanIconColor, 100),
                        lineColor: convertColor(meanIconBorderColor, 100),
                        radius: meanIconRadius,
                        symbol: mapSymbolName(meanIconSides,
                            meanIconShape == SPOKE)
                    },
                    color: pluckNumber(FCChartObj.drawmeanconnector,
                        dataset.drawmeanconnector,
                        0) ? convertColor(pluck(dataset.meanconnectorcolor,
                            FCChartObj.meanconnectorcolor, meanIconColor),
                        pluckNumber(dataset.meanconnectoralpha,
                            FCChartObj.meanconnectoralpha, 100)) : COLOR_TRANSPARENT,
                    lineWidth: pluckNumber(FCChartObj.drawmeanconnector,
                        dataset.drawmeanconnector, 0) ?
                        pluckNumber(dataset.meanconnectorthickness,
                            FCChartObj.meanconnectorthickness, 1) : 0,
                    shadow: 0,
                    legendFillColor: series.legendFillColor
                };
                sdSeries = {
                    type: 'line',
                    name: 'SD',
                    relatedSeries: 'boxandwhisker',
                    data: SDArr,
                    legendIndex: legendIndex + (legendIndexInc * 2),
                    showInLegend: !! hasValidSD && showInLegend &&
                        showDetailedLegend,
                    marker: {
                        fillColor: convertColor(sdIconColor, 100),
                        lineColor: convertColor(sdIconBorderColor, 100),
                        radius: sdIconRadius,
                        symbol: mapSymbolName(sdIconSides,
                            sdIconShape == SPOKE)
                    },
                    color: pluckNumber(FCChartObj.drawsdconnector,
                        dataset.drawsdconnector, 0) ?
                        convertColor(pluck(dataset.sdconnectorcolor,
                                FCChartObj.sdconnectorcolor, sdIconColor),
                            pluckNumber(dataset.sdconnectoralpha,
                                FCChartObj.sdconnectoralpha, 100)) : COLOR_TRANSPARENT,
                    lineWidth: pluckNumber(FCChartObj.drawsdconnector,
                        dataset.drawsdconnector, 0) ?
                        pluckNumber(dataset.sdconnectorthickness,
                            FCChartObj.sdconnectorthickness, 1) : 0,
                    shadow: 0,
                    pointStart: pointStart,
                    legendFillColor: series.legendFillColor
                };
                mdSeries = {
                    type: 'line',
                    name: 'MD',
                    relatedSeries: 'boxandwhisker',
                    data: MDArr,
                    legendIndex: legendIndex + (legendIndexInc * 3),
                    showInLegend: !! hasValidMD && showInLegend &&
                        showDetailedLegend,
                    marker: {
                        fillColor: convertColor(mdIconColor, 100),
                        lineColor: convertColor(mdIconBorderColor, 100),
                        radius: mdIconRadius,
                        symbol: mapSymbolName(mdIconSides,
                            mdIconShape == SPOKE)
                    },
                    color: pluckNumber(FCChartObj.drawmdconnector,
                        dataset.drawmdconnector, 0) ?
                        convertColor(pluck(dataset.mdconnectorcolor,
                                FCChartObj.mdconnectorcolor, mdIconColor),
                            pluckNumber(dataset.mdconnectoralpha,
                                FCChartObj.mdconnectoralpha, 100)) : COLOR_TRANSPARENT,
                    lineWidth: pluckNumber(FCChartObj.drawmdconnector,
                        dataset.drawmdconnector, 0) ?
                        pluckNumber(dataset.mdconnectorthickness,
                            FCChartObj.mdconnectorthickness, 1) : 0,
                    shadow: 0,
                    pointStart: pointStart,
                    legendFillColor: series.legendFillColor
                };
                qdSeries = {
                    type: 'line',
                    name: 'QD',
                    relatedSeries: 'boxandwhisker',
                    data: QDArr,
                    legendIndex: legendIndex + (legendIndexInc * 4),
                    showInLegend: !! hasValidQD && showInLegend &&
                        showDetailedLegend,
                    marker: {
                        fillColor: convertColor(qdIconColor, 100),
                        lineColor: convertColor(qdIconBorderColor, 100),
                        radius: qdIconRadius,
                        symbol: mapSymbolName(qdIconSides,
                            qdIconShape == SPOKE)
                    },
                    color: pluckNumber(FCChartObj.drawqdconnector,
                        dataset.drawqdconnector, 0) ?
                        convertColor(pluck(dataset.qdconnectorcolor,
                                FCChartObj.qdconnectorcolor, qdIconColor),
                            pluckNumber(dataset.qdconnectoralpha,
                                FCChartObj.qdconnectoralpha, 100)) : COLOR_TRANSPARENT,
                    lineWidth: pluckNumber(FCChartObj.drawqdconnector,
                        dataset.drawqdconnector, 0) ?
                        pluckNumber(dataset.qdconnectorthickness,
                            FCChartObj.qdconnectorthickness, 1) : 0,
                    shadow: 0,
                    pointStart: pointStart,
                    legendFillColor: series.legendFillColor
                };
                outliersSeries = {
                    type: 'line',
                    name: 'Outlier',
                    relatedSeries: 'boxandwhisker',
                    showInLegend: !! (outliersArr && outliersArr.length) &&
                        showInLegend && showDetailedLegend,
                    data: outliersArr,
                    legendIndex: legendIndex + (legendIndexInc * 5),
                    marker: {
                        fillColor: convertColor(outlierIconColor, 100),
                        lineColor: convertColor(outlierIconBorderColor, 100),
                        radius: outlierIconRadius,
                        symbol: mapSymbolName(outlierIconSides,
                            outlierIconShape == SPOKE)
                    },
                    color: COLOR_TRANSPARENT,
                    lineWidth: 0,
                    shadow: 0,
                    pointStart: pointStart,
                    legendFillColor: series.legendFillColor
                };

                HCObj._meanDataArr.push(meanSeries);
                HCObj._sdDataArr.push(sdSeries);
                HCObj._mdDataArr.push(mdSeries);
                HCObj._qdDataArr.push(qdSeries);
                HCObj._outliers.push(outliersSeries);

                return series;
            },

            series: function(FCObj, HCObj, chartName) {
                var series = HCObj.series,
                    meanDataArr = HCObj._meanDataArr = [],
                    sdDataArr = HCObj._sdDataArr = [],
                    mdDataArr = HCObj._mdDataArr = [],
                    qdDataArr = HCObj._qdDataArr = [],
                    outliers = HCObj._outliers = [],
                    conf = HCObj[CONFIGKEY],
                    yAxis = HCObj.yAxis[0],
                    plotSpacePercent = conf.plotSpacePercent * 2,
                    relSer,
                    seriesObj,
                    perSeriesLen,
                    length,
                    datasetLen,
                    pointStart,
                    index,
                    index2,
                    ind,
                    outliersDataArr,
                    outliersObj,
                    outliersDataObj,
                    valueY,
                    yMin,
                    yMax;

                conf.dataSeparator = pluck(HCObj.chart.dataseparator, COMMASTRING);
                conf.bwCalc = new BoxAndWhiskerStatisticalCalc(
                    FCObj.chart.calculationmethod, conf.numberFormatter,
                    conf.dataSeparator);
                // call the parent API series FN
                chartAPI.multiseries.series.call(this, FCObj, HCObj, chartName);

                datasetLen = series && series.length;
                length = mathMax(meanDataArr.length, sdDataArr.length,
                    mdDataArr.length, qdDataArr.length, outliers.length,
                    datasetLen);
                perSeriesLen = (1 - plotSpacePercent) / datasetLen;

                // Get the yAxis limits to hide the Outliers values outside
                // the limits
                yMin = yAxis.min;
                yMax = yAxis.max;

                HCObj.series = series.concat(meanDataArr, sdDataArr,
                    mdDataArr, qdDataArr, outliers);

                // Creating related series to manage legend click
                for (index = 0; index < datasetLen; index += 1) {
                    seriesObj = series[index];
                    relSer = index;
                    !seriesObj.relatedSeries && (seriesObj.relatedSeries = []);
                    for (index2 = 0; index2 < 5; index2 += 1) {
                        relSer += datasetLen;
                        seriesObj.relatedSeries.push(relSer);
                    }
                }

                for (index2 = index = 0; index2 < length; index2 += 1, index += 1) {

                    pointStart = (((datasetLen - 1) * -0.5) + index) *
                        perSeriesLen;

                    meanDataArr[index] && (meanDataArr[index].pointStart =
                        pointStart);
                    sdDataArr[index] && (sdDataArr[index].pointStart = pointStart);
                    qdDataArr[index] && (qdDataArr[index].pointStart = pointStart);
                    mdDataArr[index] && (mdDataArr[index].pointStart = pointStart);
                    outliers[index] && (outliers[index].pointStart = pointStart);

                    outliersObj = outliers[index];
                    if ((outliersDataArr = outliersObj && outliersObj.data)) {
                        for (ind = 0; ind < outliersDataArr.length; ind += 1) {
                            // Hiding outliers values outside the axis limits
                            outliersDataObj = outliersDataArr[ind];
                            valueY = outliersDataObj.y;
                            outliersDataObj.y = valueY > yMax ||
                                valueY < yMin ? null : valueY;
                        }
                    }
                }

                delete HCObj._meanDataArr;
                delete HCObj._sdDataArr;
                delete HCObj._mdDataArr;
                delete HCObj._qdDataArr;
                delete HCObj._outliers;
            },

            // Created getTooltext function to reduce repetition of code
            getTooltext: function(toolText, HCObj, FCChartObj, dataset, dataObj,
                max, min, q1, q3, median, sd, qd, md, mean, label, value) {
                var NumberFormatter = this.numberFormatter;

                return parseTooltext(toolText, [1, 2, 3, 4, 5, 6, 62, 63, 64, 65,
                    66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80
                ], {
                    maxValue: max,
                    maxDataValue: NumberFormatter.dataLabels(max),
                    minValue: min,
                    minDataValue: NumberFormatter.dataLabels(min),
                    Q1: NumberFormatter.dataLabels(q1),
                    unformattedQ1: q1,
                    Q3: NumberFormatter.dataLabels(q3),
                    unformattedQ3: q3,
                    median: NumberFormatter.dataLabels(median),
                    unformattedMedian: median,

                    SD: NumberFormatter.dataLabels(sd),
                    unformattedSD: sd,
                    QD: NumberFormatter.dataLabels(qd),
                    unformattedQD: qd,
                    MD: NumberFormatter.dataLabels(md),
                    unformattedMD: md,
                    mean: NumberFormatter.dataLabels(mean),
                    unformattedMean: mean,
                    label: parseUnsafeString(label),
                    yaxisName: parseUnsafeString(FCChartObj.yaxisname),
                    xaxisName: parseUnsafeString(FCChartObj.xaxisname),
                    formattedValue: NumberFormatter.dataLabels(value),
                    value: value
                }, {
                    value: value
                }, FCChartObj, dataset);
            },


            /**
             * Parses hover attribute for upperBox, lowerBox, upperQuartile, lowerQuartile,
             * upperWhisker, lowerWhisker, upperBoxBorder, lowerBoxBorder and median.
             *
             * @param {object} dataObj FusionCharts data point obj.
             * @param {object} dataset FusionCharts dataset obj.
             * @param {object} fcChartObj FusionCharts chart obj
             * @param {object} defaults default value of hover attribute
             *
             * @return {object} Hover attribute object which can be directely applied to the corresponding element
             */
            pointHoverOptions: function(dataObj, dataset, fcChartObj, defaults) {
                var hoverEffect = pluckNumber(dataObj.showhovereffect, dataset.showhovereffect,
                        fcChartObj.plothovereffect, fcChartObj.showhovereffect),
                    // Parse attribute to highlight data plot on hover
                    highlight = pluckNumber(dataObj.highlightonhover,
                        dataset.highlightonhover, dataset.highlightplotonhover,
                        fcChartObj.highlightonhover, fcChartObj.highlightplotonhover, hoverEffect),
                    upperBox = {},
                    lowerBox = {},
                    upperQuartile = {},
                    lowerQuartile = {},
                    upperWhisker = {},
                    lowerWhisker = {},
                    upperBoxBorder = {},
                    lowerBoxBorder = {},
                    median = {},
                    hoverAttr,
                    enabled;

                // Parse attributes
                upperBox.color = pluck(dataObj.upperboxhovercolor, dataset.upperboxhovercolor,
                    fcChartObj.plotfillhovercolor, fcChartObj.upperboxhovercolor);
                upperBox.alpha = pluck(dataObj.upperboxhoveralpha, dataset.upperboxhoveralpha,
                    fcChartObj.upperboxhoveralpha);

                upperBoxBorder.color = pluck(dataObj.upperboxborderhovercolor, dataset.upperboxborderhovercolor,
                    fcChartObj.upperboxborderhovercolor);
                upperBoxBorder.alpha = pluck(dataObj.upperboxborderhoveralpha, dataset.upperboxborderhoveralpha,
                    fcChartObj.upperboxborderhoveralpha);
                upperBoxBorder.thickness = pluckNumber(dataObj.upperboxborderhoverthickness,
                    dataset.upperboxborderhoverthickness, fcChartObj.upperboxborderhoverthickness);

                lowerBox.color = pluck(dataObj.lowerboxhovercolor, dataset.lowerboxhovercolor,
                    fcChartObj.plotfillhovercolor, fcChartObj.lowerboxhovercolor);
                lowerBox.alpha = pluck(dataObj.lowerboxhoveralpha, dataset.lowerboxhoveralpha,
                    fcChartObj.lowerboxhoveralpha);

                lowerBoxBorder.color = pluck(dataObj.lowerboxborderhovercolor, dataset.lowerboxborderhovercolor,
                    fcChartObj.lowerboxborderhovercolor);
                lowerBoxBorder.alpha = pluck(dataObj.lowerboxborderhoveralpha, dataset.lowerboxborderhoveralpha,
                    fcChartObj.lowerboxborderhoveralpha);
                lowerBoxBorder.thickness = pluckNumber(dataObj.lowerboxborderhoverthickness,
                    dataset.lowerboxborderhoverthickness, fcChartObj.lowerboxborderhoverthickness);

                upperWhisker.color = pluck(dataObj.upperwhiskerhovercolor, dataset.upperwhiskerhovercolor,
                    fcChartObj.upperwhiskerhovercolor);
                upperWhisker.alpha = pluck(dataObj.upperwhiskerhoveralpha, dataset.upperwhiskerhoveralpha,
                    fcChartObj.upperwhiskerhoveralpha);
                upperWhisker.thickness = pluck(dataObj.upperwhiskerhoverthickness, dataset.upperwhiskerhoverthickness,
                    fcChartObj.upperwhiskerhoverthickness);

                lowerWhisker.color = pluck(dataObj.lowerwhiskerhovercolor, dataset.lowerwhiskerhovercolor,
                    fcChartObj.lowerwhiskerhovercolor);
                lowerWhisker.alpha = pluck(dataObj.lowerwhiskerhoveralpha, dataset.lowerwhiskerhoveralpha,
                    fcChartObj.lowerwhiskerhoveralpha);
                lowerWhisker.thickness = pluck(dataObj.lowerwhiskerhoverthickness, dataset.lowerwhiskerhoverthickness,
                    fcChartObj.lowerwhiskerhoverthickness);

                upperQuartile.color = pluck(dataObj.upperquartilehovercolor, dataset.upperquartilehovercolor,
                    fcChartObj.upperquartilehovercolor);
                upperQuartile.alpha = pluck(dataObj.upperquartilehoveralpha, dataset.upperquartilehoveralpha,
                    fcChartObj.upperquartilehoveralpha);
                upperQuartile.thickness = pluck(dataObj.upperquartilehoverthickness,
                    dataset.upperquartilehoverthickness, fcChartObj.upperquartilehoverthickness);

                lowerQuartile.color = pluck(dataObj.lowerquartilehovercolor, dataset.lowerquartilehovercolor,
                    fcChartObj.lowerquartilehovercolor);
                lowerQuartile.alpha = pluck(dataObj.lowerquartilehoveralpha, dataset.lowerquartilehoveralpha,
                    fcChartObj.lowerquartilehoveralpha);
                lowerQuartile.thickness = pluck(dataObj.lowerquartilehoverthickness,
                    dataset.lowerquartilehoverthickness, fcChartObj.lowerquartilehoverthickness);

                median.color = pluck(dataObj.medianhovercolor, dataset.medianhovercolor,
                    fcChartObj.medianhovercolor);
                median.alpha = pluck(dataObj.medianhoveralpha, dataset.medianhoveralpha,
                    fcChartObj.medianhoveralpha);
                median.thickness = pluck(dataObj.medianhoverthickness, dataset.medianhoverthickness,
                    fcChartObj.medianhoverthickness);

                // Enable hover effect if any hover attribute are defined.
                hoverAttr = !!pluck(upperBox.color, upperBox.alpha, upperBoxBorder.color,
                        upperBoxBorder.alpha, upperBoxBorder.thickness, lowerBox.color, lowerBox.alpha,
                        lowerBoxBorder.color, lowerBoxBorder.thickness, lowerBoxBorder.alpha,
                        upperWhisker.color, upperWhisker.alpha, upperWhisker.thickness, lowerWhisker.color,
                        lowerWhisker.alpha, lowerWhisker.thickness, upperQuartile.color, upperQuartile.alpha,
                        upperQuartile.thickness, lowerQuartile.color, lowerQuartile.alpha, lowerQuartile.thickness,
                        median.color, median.alpha, median.thickness, highlight);

                // Highlight should work only if default hover effect or
                // highlighting of data plot is enabled using attributes.
                if (hoverEffect === UNDEFINED && highlight === UNDEFINED && hoverAttr) {
                    highlight = 0;
                }

                // If hover effect is enabled, parse hover related attributes with the default value
                if ((hoverEffect === UNDEFINED && hoverAttr) || hoverEffect) {
                    enabled = true;

                    upperBox.color = pluck(upperBox.color, highlight ? getLightColor(defaults.upperBoxColor, 70) :
                            defaults.upperBoxColor);
                    upperBox.alpha = pluck(upperBox.alpha, defaults.upperBoxAlpha);

                    lowerBox.color = pluck(lowerBox.color, highlight ? getLightColor(defaults.lowerBoxColor, 70) :
                            defaults.lowerBoxColor);
                    lowerBox.alpha = pluck(lowerBox.alpha, defaults.lowerBoxAlpha);

                    upperBoxBorder.color = pluck(upperBoxBorder.color, defaults.upperBoxBorderColor);
                    upperBoxBorder.alpha = pluckNumber(upperBoxBorder.alpha, defaults.upperBoxBorderAlpha);
                    upperBoxBorder.stroke = convertColor(upperBoxBorder.color, upperBoxBorder.alpha);
                    upperBoxBorder['stroke-width'] = pluckNumber(upperBoxBorder.thickness,
                        defaults.upperBoxBorderThickness);
                    delete upperBoxBorder.color;
                    delete upperBoxBorder.alpha;
                    delete upperBoxBorder.thickness;

                    lowerBoxBorder.color = pluck(lowerBoxBorder.color, defaults.lowerBoxBorderColor);
                    lowerBoxBorder.alpha = pluck(lowerBoxBorder.alpha, defaults.lowerBoxBorderAlpha);
                    lowerBoxBorder.stroke = convertColor(lowerBoxBorder.color, lowerBoxBorder.alpha);
                    lowerBoxBorder['stroke-width'] = pluckNumber(lowerBoxBorder.thickness,
                        defaults.lowerBoxBorderThickness);
                    delete lowerBoxBorder.color;
                    delete lowerBoxBorder.alpha;
                    delete lowerBoxBorder.thickness;

                    upperWhisker.color = pluck(upperWhisker.color, defaults.upperWhiskerColor, 70);
                    upperWhisker.alpha = pluck(upperWhisker.alpha, defaults.upperWhiskerAlpha);
                    upperWhisker.stroke = convertColor(upperWhisker.color, upperWhisker.alpha);
                    upperWhisker['stroke-width'] = pluck(upperWhisker.thickness, defaults.upperWhiskerThickness);
                    delete upperWhisker.color;
                    delete upperWhisker.alpha;
                    delete upperWhisker.thickness;

                    lowerWhisker.color = pluck(lowerWhisker.color, defaults.lowerWhiskerColor, 70);
                    lowerWhisker.alpha = pluck(lowerWhisker.alpha, defaults.lowerWhiskerAlpha);
                    lowerWhisker.stroke = convertColor(lowerWhisker.color, lowerWhisker.alpha);
                    lowerWhisker['stroke-width'] = pluck(lowerWhisker.thickness, defaults.lowerWhiskerThickness);
                    delete lowerWhisker.color;
                    delete lowerWhisker.alpha;
                    delete lowerWhisker.thickness;

                    upperQuartile.color = pluck(upperQuartile.color, defaults.upperQuartileColor, 70);
                    upperQuartile.alpha = pluck(upperQuartile.alpha, defaults.upperQuartileAlpha);
                    upperQuartile.stroke = convertColor(upperQuartile.color, upperQuartile.alpha);
                    upperQuartile['stroke-width'] = pluck(upperQuartile.thickness, defaults.upperQuartileThickness);
                    delete upperQuartile.color;
                    delete upperQuartile.alpha;
                    delete upperQuartile.thickness;

                    lowerQuartile.color = pluck(lowerQuartile.color, defaults.lowerQuartileColor, 70);
                    lowerQuartile.alpha = pluck(lowerQuartile.alpha, defaults.lowerQuartileAlpha);
                    lowerQuartile.stroke = convertColor(lowerQuartile.color, lowerQuartile.alpha);
                    lowerQuartile['stroke-width'] = pluck(lowerQuartile.thickness, defaults.lowerQuartileThickness);
                    delete lowerQuartile.color;
                    delete lowerQuartile.alpha;
                    delete lowerQuartile.thickness;

                    median.color = pluck(median.color, defaults.medianColor, 70);
                    median.alpha = pluck(median.alpha, defaults.medianAlpha);
                    median.stroke = convertColor(median.color, median.alpha);
                    median['stroke-width'] = pluck(median.thickness, defaults.medianThickness);
                    delete median.color;
                    delete median.alpha;
                    delete median.thickness;
                }

                return {
                    enabled: enabled,
                    upperBox: upperBox,
                    upperBoxBorder: upperBoxBorder,
                    lowerBox: lowerBox,
                    lowerBoxBorder: lowerBoxBorder,
                    upperQuartile: upperQuartile,
                    lowerQuartile: lowerQuartile,
                    upperWhisker: upperWhisker,
                    lowerWhisker: lowerWhisker,
                    median: median
                };
            },

            getPointStub: function(HCObj, FCChartObj, dataset, dataObj,
                max, q3, median, q1, min, mean, md, sd, qd, label) {
                var toolText = BLANK,
                    HCConfig = HCObj[CONFIGKEY],
                    tooltipSepChar = HCConfig.tooltipSepChar,
                    NumberFormatter = this.numberFormatter,
                    showValues = pluckNumber(dataObj.showvalue,
                        dataset.showvalues, FCChartObj.showvalues, 1),
                    maxVal = {
                        'true': NumberFormatter.dataLabels(max),
                        'false': BLANK
                    },
                    q3Val = {
                        'true': NumberFormatter.dataLabels(q3),
                        'false': BLANK
                    },
                    medianVal = {
                        'true': NumberFormatter.dataLabels(median),
                        'false': BLANK
                    },
                    q1Val = {
                        'true': NumberFormatter.dataLabels(q1),
                        'false': BLANK
                    },
                    minVal = {
                        'true': NumberFormatter.dataLabels(min),
                        'false': BLANK
                    };
                //create the tooltext
                if (!HCConfig.showTooltip) {
                    toolText = BLANK;
                } else {
                    toolText = getValidValue(parseUnsafeString(pluck(dataObj.tooltext, dataset.plottooltext,
                        HCConfig.tooltext)));
                    if (toolText !== undefined) {
                        toolText = this.getTooltext(toolText, HCObj, FCChartObj,
                            dataset, dataObj, max, min, q1, q3, median, sd, qd, md, mean, label);
                    } else {
                        toolText = '<b>Maximum' + tooltipSepChar + '</b>' +
                            maxVal[!! 1] + '<br/>' +
                            '<b>Q3' + tooltipSepChar + '</b>' +
                            q3Val[!! 1] + '<br/>' +
                            '<b>Median' + tooltipSepChar + '</b>' +
                            medianVal[!! 1] + '<br/>' +
                            '<b>Q1' + tooltipSepChar + '</b>' +
                            q1Val[!! 1] + '<br/>' +
                            '<b>Minimum' + tooltipSepChar + '</b>' +
                            minVal[!! 1];
                    }
                }

                return {
                    toolText: toolText,
                    link: pluck(dataObj.link),
                    categoryLabel: label,
                    displayValueMax: maxVal[!! (showValues &&
                        pluckNumber(dataObj.showmaxvalue, dataset.showmaxvalues,
                            FCChartObj.showmaxvalues, 1))],
                    displayValueMid: medianVal[!! (showValues &&
                        pluckNumber(dataObj.showmedianvalue,
                            dataset.showmedianvalues, FCChartObj.showmedianvalues,
                            1))],
                    displayValueMin: minVal[!! (showValues &&
                        pluckNumber(dataObj.showminvalue, dataset.showminvalues,
                            FCChartObj.showminvalues, 1))],
                    displayValueQ3: q3Val[!! (showValues &&
                        pluckNumber(dataObj.showq3value,
                            dataset.showq3values, FCChartObj.showq3values, 0))],
                    displayValueQ1: q1Val[!! (showValues &&
                        pluckNumber(dataObj.showq1value,
                            dataset.showq1values, FCChartObj.showq1values, 0))]
                };
            }
        }, chartAPI.multiseries);

        /* HeatMap */
        chartAPI('heatmap', {
            friendlyName: 'Heatmap Chart',
            standaloneInit: true,
            creditLabel: creditLabel,
            defaultSeriesType: 'heatmap',
            tooltipsepchar: ': ',
            tooltipConstraint: 'chart',
            rendererId: 'heatmap',

            series: function(FCObj, HCObj, seriesName) {
                var FCChartObj = FCObj.chart,
                    HCChartObj = HCObj.chart,
                    conf = HCObj[CONFIGKEY],
                    colorM = this.colorManager,
                    series = HCObj.series,
                    NumberFormatter = this.numberFormatter,
                    rows = FCObj.rows && FCObj.rows.row,
                    rowsLength = rows && rows.length,
                    columns = FCObj.columns && FCObj.columns.column,
                    columnsLength = columns && columns.length,
                    dataset = FCObj.dataset,
                    data = dataset && dataset.data,
                    colorRange = FCObj.colorrange || {},
                    colorArr,
                    colorRangeLen,
                    // Use mapByPercent or not
                    mapByPercent = conf.mapByPercent = pluckNumber(colorRange.mapbypercent, 0),
                    mapByCategory = conf.mapByCategory =
                        pluckNumber(FCChartObj.mapbycategory, 0),
                    useColorGradient = !mapByCategory && pluckNumber((colorRange.gradient), 0),
                    plotFillAlpha = pluck(FCChartObj.plotfillalpha, 100),
                    showLabels = pluckNumber(FCChartObj.showlabels,
                        FCChartObj.showlabel, 1),

                    //Plot cosmetic properties
                    showPlotBorder = pluckNumber(FCChartObj.showplotborder, 1),
                    plotBorderThickness = showPlotBorder ?
                        pluckNumber(FCChartObj.plotborderthickness, 1) : 0,
                    plotBorderColor = pluck(FCChartObj.plotbordercolor,
                        colorM.getColor('plotBorderColor')),
                    plotBorderAlpha = pluck(FCChartObj.plotborderalpha,
                        showPlotBorder ? 95 : 0).toString(),
                    borderColor = convertColor(plotBorderColor, plotBorderAlpha),
                    //Dash Properties
                    plotBorderDashed = pluckNumber(FCChartObj.plotborderdashed, 0),
                    plotBorderDashLen = pluckNumber(FCChartObj.plotborderdashlen,
                        5),
                    plotBorderDashGap = pluckNumber(FCChartObj.plotborderdashgap,
                        4),
                    dashStyle = plotBorderDashed ? getDashStyle(plotBorderDashLen,
                        plotBorderDashGap, plotBorderThickness) : undefined,
                    ColorRangeManager = lib.colorRange,

                    rowCount = 0,
                    columnsCount = 0,
                    rowCountWRTData = 0,
                    columnCountWRTData = 0,
                    rowIdObj = conf.rowIdObj = {},
                    columnIdObj = conf.columnIdObj = {},
                    rawValues = [],
                    dataStore = [],
                    dataCount = 0,
                    uniqueRowCol = [],
                    rowId,
                    rowIdLowerCase,
                    columnId,
                    columnIdLowerCase,
                    colorObj,
                    colorDataObj,
                    minHeatValue,
                    heatRange,
                    maxHeatValue,
                    dataObj,
                    setValue,
                    datasetIndex,
                    datasetLength,
                    columnObj,
                    length,
                    index,
                    rowObj;
                HCChartObj.showHoverEffect = pluckNumber(FCChartObj.showhovereffect, 1);
                if (useColorGradient) {
                    HCObj.legend.type = 'gradient';
                }

                // Hide legend
                HCObj.legend.enabled = Boolean(pluckNumber(FCChartObj.showlegend, 1));



                // Parsing of rows
                // Row must contain an id
                for (index = 0; index < rowsLength; index += 1) {
                    rowObj = rows[index];
                    rowId = rowObj.id;
                    if (defined(rowId) && rowId !== BLANK) {
                        rowCount += 1;
                        rowIdObj[rowId.toLowerCase()] = {
                            index: rowCount,
                            label: pluckNumber(rowObj.showlabel, FCChartObj.showyaxislabels,
                                FCChartObj.showyaxisnames, showLabels) ?
                                pluck(rowObj.label, rowObj.name, rowId) : BLANK
                        };
                    }
                }
                // Parsing of columns
                // Column must contain an id
                for (index = 0; index < columnsLength; index += 1) {
                    columnObj = columns[index];
                    columnId = columnObj.id;
                    if (defined(columnId) && columnId !== BLANK) {
                        columnIdObj[columnId.toLowerCase()] = {
                            index: columnsCount,
                            label: pluckNumber(columnObj.showlabel, FCChartObj.showxaxislabels,
                               FCChartObj.showxaxisnames, showLabels) ?
                                pluck(columnObj.label, columnObj.name, columnId) : BLANK
                        };
                        columnsCount += 1;
                    }
                }




                for (datasetIndex = 0, datasetLength = dataset && dataset.length; datasetIndex <
                        datasetLength; datasetIndex += 1) {
                    data = dataset[datasetIndex] && dataset[datasetIndex].data;

                    for (index = 0, length = data && data.length; index < length; index += 1) {
                        dataObj = data[index];
                        setValue =
                            NumberFormatter.getCleanValue(dataObj.value);
                        if (setValue === null && !mapByCategory) {
                            continue;
                        }

                        rowId = getValidValue(dataObj.rowid, dataObj.rowids);
                        rowIdLowerCase = getValidValue(rowId, BLANK)
                            .toLowerCase();
                        columnId = getValidValue(dataObj.columnid,
                            dataObj.columnids);
                        columnIdLowerCase = getValidValue(columnId, BLANK)
                            .toLowerCase();

                        rawValues.push(setValue);
                        // Find min and max value in data
                        if (!defined(minHeatValue) && !defined(maxHeatValue) &&
                            defined(setValue)) {
                            maxHeatValue = minHeatValue = setValue;
                        }
                        if (minHeatValue > setValue) {
                            minHeatValue = setValue;
                        }
                        if (maxHeatValue < setValue) {
                            maxHeatValue = setValue;
                        }

                        // Count number of rows and columns for data
                        if (defined(rowIdLowerCase) && !defined(rowIdObj[rowIdLowerCase]) && !rowsLength) {
                            rowCountWRTData += 1;
                            rowIdObj[rowIdLowerCase] = {
                                index: rowCountWRTData,
                                label: rowId
                            };
                        }
                        if (defined(columnIdLowerCase) && !defined(columnIdObj[columnIdLowerCase]) && !columnsLength) {
                            columnIdObj[columnIdLowerCase] = {
                                index: columnCountWRTData,
                                label: columnId
                            };
                            columnCountWRTData += 1;
                        }

                        rowObj = rowIdObj[rowIdLowerCase];
                        columnObj = columnIdObj[columnIdLowerCase];


                        if (rowObj && columnObj) {
                            if (!defined(uniqueRowCol[rowObj.index])) {
                                uniqueRowCol[rowObj.index] = [];
                            }
                            // To avoid repetition of the data with the same
                            // row and column
                            if (!uniqueRowCol[rowObj.index][columnObj.index]) {
                                dataCount += 1;
                                dataStore.push({
                                    rowId: rowId,
                                    columnId: columnId,
                                    categoryId: pluck(dataObj.colorrangelabel,
                                        dataObj.categoryid, dataObj.categoryname,
                                        dataObj.category),
                                    tlLabel: parseUnsafeString(pluck(dataObj.tllabel,
                                        dataObj.ltlabel)),
                                    trLabel: parseUnsafeString(pluck(dataObj.trlabel,
                                        dataObj.rtlabel)),
                                    blLabel: parseUnsafeString(pluck(dataObj.bllabel,
                                        dataObj.lblabel)),
                                    brLabel: parseUnsafeString(pluck(dataObj.brlabel,
                                        dataObj.rblabel)),
                                    rowLabel: rowObj.label,
                                    columnLabel: columnObj.label,
                                    setColor: dataObj.color &&
                                        dataObj.color.replace(dropHash, HASHSTRING),
                                    setAlpha: pluck(dataObj.alpha,
                                        plotFillAlpha),
                                    setShowLabel: pluckNumber(dataObj.showlabel,
                                        dataObj.showname, showLabels),
                                    colorRangeLabel: dataObj.colorrangelabel,
                                    displayValue: dataObj.displayvalue,
                                    tooltext: dataObj.tooltext,
                                    showvalue: dataObj.showvalue,
                                    link: dataObj.link,
                                    hoverColor: pluck(dataObj.hovercolor, FCChartObj.hovercolor,
                                        FCChartObj.plotfillhovercolor),
                                    hoverAlpha: pluckNumber(dataObj.hoveralpha, FCChartObj.hoveralpha,
                                        FCChartObj.plotfillhoveralpha),
                                    //Refernce for the data index
                                    index: dataCount,
                                    value: setValue,
                                    y: rowObj.index,
                                    x: columnObj.index,
                                    //store original value for further reference
                                    _value: dataObj.value,
                                    _cleanValue: setValue
                                });
                                uniqueRowCol[rowObj.index][columnObj.index] =
                                    dataCount;
                            } else {
                                // If the data is being repeated, we update the old
                                // data with the latest one
                                dataStore[uniqueRowCol[rowObj.index][columnObj.index] - 1] = {
                                    rowId: rowId,
                                    columnId: columnId,
                                    categoryId: pluck(dataObj.colorrangelabel,
                                        dataObj.categoryid, dataObj.categoryname,
                                        dataObj.category),
                                    tlLabel: parseUnsafeString(pluck(dataObj.tllabel,
                                        dataObj.ltlabel)),
                                    trLabel: parseUnsafeString(pluck(dataObj.trlabel,
                                        dataObj.rtlabel)),
                                    blLabel: parseUnsafeString(pluck(dataObj.bllabel,
                                        dataObj.lblabel)),
                                    brLabel: parseUnsafeString(pluck(dataObj.brlabel,
                                        dataObj.rblabel)),
                                    rowLabel: rowObj.label,
                                    columnLabel: columnObj.label,
                                    setColor: dataObj.color,
                                    setAlpha: pluck(dataObj.alpha,
                                        plotFillAlpha),
                                    setShowLabel: pluckNumber(dataObj.showlabel,
                                        dataObj.showname, showLabels),
                                    colorRangeLabel: dataObj.colorrangelabel,
                                    displayValue: dataObj.displayvalue,
                                    tooltext: dataObj.tooltext,
                                    showvalue: dataObj.showvalue,
                                    link: dataObj.link,
                                    hoverColor: pluck(dataObj.hovercolor, FCChartObj.hovercolor,
                                        FCChartObj.plotfillhovercolor),
                                    hoverAlpha: pluckNumber(dataObj.hoveralpha, FCChartObj.hoveralpha,
                                        FCChartObj.plotfillhoveralpha),
                                    //Refernce for the data index
                                    index: dataCount,
                                    value: setValue,
                                    y: rowObj.index,
                                    x: columnObj.index,
                                    //store original value for further reference
                                    _value: dataObj.value,
                                    _cleanValue: setValue
                                };
                            }
                        }
                    }
                }


                //if there has no valid set then remove all series sothat it shows no data messege
                if (dataStore.length) {

                    conf.rowCount = rowCount = mathMax(rowCount, rowCountWRTData);
                    conf.columnCount = columnsCount = mathMax(columnsCount,
                        columnCountWRTData);

                    // Revert the columnObj index
                    for (index in rowIdObj) {
                        rowIdObj[index].index = rowCount - rowIdObj[index].index + 1;
                    }

                    conf.minHeatValue = minHeatValue;
                    conf.maxHeatValue = maxHeatValue;
                    heatRange = maxHeatValue - minHeatValue;

                    // mapByPercent will enable only when mapByCategory false
                    mapByPercent = mapByPercent && !mapByCategory,

                    // colorRange, dataMin, dataMax, autoOrderLegendIcon
                    HCObj.colorRange = new ColorRangeManager({
                        colorRange: FCObj.colorrange,
                        dataMin: minHeatValue,
                        dataMax: maxHeatValue,
                        sortLegend: pluckNumber(FCChartObj.autoorderlegendicon, FCChartObj.autoorderlegendicon, 0),
                        mapByCategory: mapByCategory,
                        defaultColor: 'cccccc',
                        numberFormatter: NumberFormatter
                    });

                    // Create series using colorRange.
                    if (useColorGradient) {
                        series.push({
                            data: [],
                            hoverEffects: this.parseSeriesHoverOptions(FCObj,
                                HCObj, dataset, seriesName),

                            borderWidth: plotBorderThickness,
                            borderColor: borderColor,
                            dashStyle: dashStyle
                        });
                    } else {
                        colorArr = HCObj.colorRange.colorArr;
                        colorRangeLen = colorArr && colorArr.length;
                        for (index = 0; index < colorRangeLen; index += 1) {
                            colorDataObj = colorArr[index];
                            if (defined(colorDataObj.code)) {
                                series.push({
                                    data: [],
                                    hoverEffects: this.parseSeriesHoverOptions(FCObj,
                                        HCObj, dataset, seriesName),

                                    name: pluck(colorDataObj.label, colorDataObj.name),
                                    borderWidth: plotBorderThickness,
                                    borderColor: borderColor,
                                    color: parseColor(colorDataObj.code),
                                    dashStyle: dashStyle
                                });
                            }
                        }
                    }

                    // Creating default series to avoid 'No data to display'.
                    if (!series.length) {
                        series.push({
                            data: [],
                            showInLegend: false
                        });
                    }

                    for (index = 0; index < dataStore.length; index += 1) {
                        dataObj = dataStore[index];
                        //store the percent value as value in case of mapby percent
                        if (mapByPercent) {
                            dataObj.value = mathRound((dataObj.value -
                                minHeatValue) / heatRange * 10000) / 100;
                        }
                        colorObj = HCObj.colorRange.getColorObj(mapByCategory ?
                            dataObj.categoryId : dataObj.value);

                        if (colorObj.outOfRange) {
                            continue;
                        }

                        dataObj.y = conf.rowCount - dataObj.y + 1;
                        dataObj.color = convertColor(pluck(dataObj.setColor,
                            colorObj.code), pluck(dataObj.setAlpha, plotFillAlpha));

                        dataObj.hoverColor = convertColor(pluck(dataObj.hoverColor, dataObj.setColor, colorObj.code),
                            pluckNumber(dataObj.hoverAlpha, 25));

                        dataObj = extend2(dataObj, this.getPointStub(dataObj,
                            dataObj.value, BLANK, HCObj, FCObj));

                        if (useColorGradient) {
                            series[0].data.push(dataObj);
                        } else {
                            series[colorObj.seriesIndex] &&
                                series[colorObj.seriesIndex].data.push(dataObj);
                        }
                    }
                }
                //remove all serie to show nodata messege
                else {
                    HCObj.series = [];
                }
                this.configureAxis(HCObj, FCObj);
            },

            getPointStub: function(setObj, value, label, HCObj, FCObj) {
                var HCConfig = HCObj[CONFIGKEY],
                    FCChartObj = FCObj.chart,
                    tooltipSepChar = HCConfig.tooltipSepChar,
                    mapByCategory = HCConfig.mapByCategory,
                    // mapByPercent will enable only when mapByCategory false
                    mapByPercent = HCConfig.mapByPercent && !mapByCategory,
                    NumberFormatter = this.numberFormatter,
                    cleanValue = setObj._cleanValue,
                    percentValue = NumberFormatter.percentValue(value),
                    formatedVal = cleanValue === null ? value :
                        NumberFormatter.dataLabels(cleanValue),
                    setTooltext = getValidValue(parseUnsafeString(pluck(setObj.tooltext, HCConfig.tooltext))),
                    setDisplayValue = getValidValue(parseUnsafeString(
                        setObj.displayValue)),
                    toolTextValue = mapByCategory ?
                        setDisplayValue : pluck(setDisplayValue, formatedVal),
                    showValue = pluckNumber(setObj.showvalue, HCConfig.showValues),
                    tlType = getValidValue(FCChartObj.tltype, BLANK),
                    trType = getValidValue(FCChartObj.trtype, BLANK),
                    blType = getValidValue(FCChartObj.bltype, BLANK),
                    brType = getValidValue(FCChartObj.brtype, BLANK),
                    tlLabel = setObj.tlLabel,
                    trLabel = setObj.trLabel,
                    blLabel = setObj.blLabel,
                    brLabel = setObj.brLabel,
                    toolText,
                    dataLink,
                    displayValue;

                if (tlType !== BLANK) {
                    tlType = '<b>' + tlType + tooltipSepChar + '</b>';
                }
                if (trType !== BLANK) {
                    trType = '<b>' + trType + tooltipSepChar + '</b>';
                }
                if (blType !== BLANK) {
                    blType = '<b>' + blType + tooltipSepChar + '</b>';
                }
                if (brType !== BLANK) {
                    brType = '<b>' + brType + tooltipSepChar + '</b>';
                }

                //create the tooltext
                if (!HCConfig.showTooltip) {
                    toolText = BLANK;
                } else if (setTooltext !== undefined) {
                    toolText = parseTooltext(setTooltext, [1, 2, 5, 6, 7, 14, 93, 94, 95, 96, 97, 98, 112, 113, 114,
                        115, 116, 117], {
                        formattedValue: formatedVal,
                        //applicable if colorRange has mapByPercent = '1'
                        percentValue: mapByPercent ? percentValue : BLANK,
                        yaxisName: parseUnsafeString(FCChartObj.yaxisname),
                        xaxisName: parseUnsafeString(FCChartObj.xaxisname)
                    }, {
                        value: setObj._value,
                        displayvalue: setObj.displayValue
                    }, FCChartObj, setObj);
                } else {
                    //determine the dispalay value then
                    toolText = toolTextValue === BLANK ? false :
                    // If mapByPercent is enabled, we show actual value as well as
                    // percent value in toolTip
                    ((mapByPercent ? '<b>Value' + tooltipSepChar + '</b>' +
                            formatedVal +
                            '<br/>' + '<b>Percentage' + tooltipSepChar + '</b>' +
                            percentValue :
                            toolTextValue) +
                        // Now we add special labels in toolTip
                        (setObj.tlLabel !== BLANK ? '<br/>' +
                            (tlType + setObj.tlLabel) : BLANK) + (setObj.trLabel !== BLANK ? '<br/>' +
                            trType + setObj.trLabel : BLANK) + (setObj.blLabel !== BLANK ? '<br/>' +
                            blType + setObj.blLabel : BLANK) + (setObj.brLabel !== BLANK ? '<br/>' +
                            brType + setObj.brLabel : BLANK));
                }
                //create the displayvalue
                if (!showValue) {
                    tlLabel = trLabel = blLabel = brLabel = displayValue =
                        BLANK;
                } else if (setDisplayValue !== undefined) {
                    displayValue = setDisplayValue;
                } else { //determine the dispalay value then
                    displayValue = mapByPercent ? percentValue : formatedVal;
                }

                ////create the link
                dataLink = pluck(setObj.link);
                return {
                    displayValue: displayValue,
                    toolText: toolText,
                    link: dataLink,
                    tlLabel: tlLabel,
                    trLabel: trLabel,
                    blLabel: blLabel,
                    brLabel: brLabel
                };
            },

            configureAxis: function(HCObj, FCObj) {
                var conf = HCObj[CONFIGKEY],
                    FCChartObj = FCObj.chart,
                    yAxis = HCObj.yAxis[0],
                    xAxis = HCObj.xAxis,
                    POINT_FIVE = -0.5,
                    rowCount = conf.rowCount,
                    columnCount = conf.columnCount,
                    axisGridManager = conf.axisGridManager,
                    rowIdObj = conf.rowIdObj,
                    columnIdObj = conf.columnIdObj,
                    colorM = this.colorManager,
                    vDivLineColor = convertColor(pluck(FCChartObj.vdivlinecolor,
                            FCChartObj.divlinecolor,
                            colorM.getColor('divLineColor')),
                        pluckNumber(FCChartObj.vdivlinealpha, FCChartObj.divlinealpha,
                            colorM.getColor('divLineAlpha'))),
                    vDivLineWidth = pluckNumber(FCChartObj.vdivlinethickness,
                        FCChartObj.divlinethickness, 1),
                    vDivLineDash = pluckNumber(FCChartObj.vdivlinedashed, FCChartObj.vdivlineisdashed,
                        FCChartObj.divlinedashed, FCChartObj.divlineisdashed, 0) ?
                        getDashStyle(pluckNumber(FCChartObj.vdivlinedashlen,
                                FCChartObj.divlinedashlen, 4),
                            pluckNumber(FCChartObj.vdivlinedashgap,
                                FCChartObj.divlinedashgap, 2), vDivLineWidth) : undefined,
                    hDivLineColor = convertColor(pluck(FCChartObj.hdivlinecolor,
                            FCChartObj.divlinecolor,
                            colorM.getColor('divLineColor')),
                        pluckNumber(FCChartObj.hdivlinealpha,
                            FCChartObj.divlinealpha,
                            colorM.getColor('divLineAlpha'))),
                    hDivLineWidth = pluckNumber(FCChartObj.hdivlinethickness,
                        FCChartObj.divlinethickness, 1),
                    hDivLineDash = pluckNumber(FCChartObj.hdivlinedashed, FCChartObj.hdivlineisdashed,
                        FCChartObj.divlinedashed, FCChartObj.divlineisdashed, 0) ?
                        getDashStyle(pluckNumber(FCChartObj.hdivlinedashlen,
                                FCChartObj.divlinedashlen, 4),
                            pluckNumber(FCChartObj.hdivlinedashgap,
                                FCChartObj.divlinedashgap, 2), vDivLineWidth) : undefined,
                    text,
                    i,
                    rowObj,
                    columnObj,
                    value,
                    xMax;

                //configure y axis
                yAxis.min = 0;
                yAxis.max = rowCount;

                //add axis labels
                for (i in rowIdObj) {
                    rowObj = rowIdObj[i];
                    value = rowObj.index;
                    text = rowObj.label;
                    axisGridManager.addAxisGridLine(yAxis, value + POINT_FIVE,
                        text, 0.1, undefined,
                        COLOR_TRANSPARENT, 1);
                    if (value < rowCount) {
                        //add lines
                        yAxis.plotBands.push({
                            isTrend: true,
                            color: hDivLineColor,
                            value: value,
                            width: hDivLineWidth,
                            dashStyle: hDivLineDash,
                            zIndex: 3
                        });
                    }
                }
                //disable default labels and grid
                yAxis.labels.enabled = false;
                yAxis.gridLineWidth = INT_ZERO;
                yAxis.alternateGridColor = COLOR_TRANSPARENT;
                //add yAxisTitle
                yAxis.title.text = parseUnsafeString(FCChartObj.yaxisname);


                xAxis.min = POINT_FIVE;
                xAxis.max = xMax = columnCount + POINT_FIVE;

                // Whether to draw the xAxis labels on top or bottom.
                xAxis.opposite = pluckNumber(FCChartObj.placexaxislabelsontop, 0);

                // Add the catcount attr at x conf so that
                // space manager works perfectly
                conf.x.catCount = columnCount;
                /** @todo block labelStep arrt in chart XML */
                //add axis labels
                for (i in columnIdObj) {
                    columnObj = columnIdObj[i];
                    value = columnObj.index;
                    text = columnObj.label;
                    axisGridManager.addXaxisCat(xAxis, value, 1, text);
                    value -= POINT_FIVE;
                    if (value < xMax) {
                        //add lines
                        xAxis.plotBands.push({
                            isTrend: true,
                            color: vDivLineColor,
                            value: value,
                            width: vDivLineWidth,
                            dashStyle: vDivLineDash,
                            zIndex: 3
                        });
                    }
                }
                //remove all grid related conf
                xAxis.labels.enabled = false;
                xAxis.gridLineWidth = INT_ZERO;
                xAxis.alternateGridColor = COLOR_TRANSPARENT;
                //add xAxisTitle
                xAxis.title.text = parseUnsafeString(FCChartObj.xaxisname);

            },
            /*
        //not required as coded inside configureAxis

        axisMinMaxSetter: function () {

        },
        */
            xAxisMinMaxSetter: function() {

            },
            placeLegendBlockRight: function() {
                var hcJSON = arguments[0],
                    legendObj = hcJSON.legend,
                    type = legendObj.type;
                if (type === 'gradient') {
                    if (lib.placeGLegendBlockRight) {
                        //chartAPI.heatmap.placeLegendBlockRight = lib.placeGLegendBlockRight;
                        return lib.placeGLegendBlockRight.apply(this, arguments);
                    } else {
                        return 0;
                    }
                } else {
                    return lib.placeLegendBlockRight.apply(this, arguments);
                }
            },
            placeLegendBlockBottom: function() {
                var hcJSON = arguments[0],
                    legendObj = hcJSON.legend,
                    type = legendObj.type;
                if (type === 'gradient') {
                    if (lib.placeGLegendBlockBottom) {
                        //chartAPI.heatmap.placeLegendBlockRight = lib.placeGLegendBlockRight;
                        return lib.placeGLegendBlockBottom.apply(this, arguments);
                    } else {
                        return 0;
                    }
                } else {
                    return lib.placeLegendBlockBottom.apply(this, arguments);
                }
            }
        }, chartAPI.column2dbase);

        /* MultiAxisLine */
        renderer('renderer.multiaxisline', {
            legendClick: function(plot, check, axisClick) {
                var cartesianRenderer = renderer['renderer.cartesian'],
                    chart = this,
                    series = chart.options.series,
                    index = plot.index,
                    axis = series[index].yAxis,
                    yAxis = chart.yAxis[axis],
                    relatedSeries = yAxis.axisData._relatedSeries,
                    len = relatedSeries.length,
                    visible = false;

                cartesianRenderer.legendClick.call(this, plot, check, axisClick);
                // Manage axis checkbox visibility if click on legend item.
                if (!axisClick) {
                    // Iterate through all series of the same axis and check if any of the series is visible or not.
                    while (len--) {
                        if (visible = series[relatedSeries[len]].visible) {
                            break;
                        }
                    }
                    // Set the axis checkbox state, according to the series visibility.
                    yAxis.checkBox.element.checked = visible;
                }
            }

        }, renderer['renderer.cartesian']);

        renderer('renderer.candlestick', {

            drawPlotCandlestickbar: function(plot, dataOptions) {
                var chart = this,
                    data = plot.data,
                    ln = data.length,
                    plotItems = plot.items,
                    datasetGraphics = plot.graphics = [],

                    paper = chart.paper,
                    layers = chart.layers,
                    options = chart.options,

                    // Directly Accessing chart definition JSON Data
                    chartAttributes = chart.definition.chart,
                    seriesOptions = options.plotOptions.series,
                    xAxis = chart.xAxis[dataOptions.xAxis || 0],
                    yAxis = chart.yAxis[dataOptions.yAxis || 0],

                    numColumns = dataOptions.numColumns || 1,
                    columnPosition = dataOptions.columnPosition || 0,

                    seriesVisibility = dataOptions.visible === false ?
                        'hidden' : 'visible',

                    xAxisZeroPos = xAxis.getAxisPosition(0),
                    xAxisFirstPos = xAxis.getAxisPosition(1),
                    groupMaxWidth = xAxisFirstPos - xAxisZeroPos,
                    definedGroupPadding = chartAttributes &&
                        chartAttributes.plotspacepercent,
                    groupPadding = seriesOptions.groupPadding,
                    maxColWidth = seriesOptions.maxColWidth,
                    groupNetWidth = (1 - definedGroupPadding * 0.01) * groupMaxWidth ||
                        mathMin(
                            groupMaxWidth * (1 - groupPadding * 2),
                            maxColWidth * numColumns
                    ),
                    groupNetHalfWidth = groupNetWidth / 2,
                    columnWidth = groupNetWidth / numColumns,
                    xPosOffset = (columnPosition * columnWidth) - groupNetHalfWidth,

                    datasetLayer = layers.dataset = layers.dataset ||
                        paper.group('dataset-orphan'),
                    is3D = false,
                    plotItem,
                    i,
                    set,
                    setLink,
                    x,
                    y,
                    previousY,
                    xPos,
                    yPos,
                    previousYPos,
                    height,
                    width,
                    // marimekko variables
                    fixedWidth,
                    setElem,
                    hotElem,
                    group,
                    plotGroup,
                    targetGroup,
                    highPos,
                    lowPos,
                    halfW,
                    path;

                // define groups
                group = datasetLayer;
                plotGroup = group.column = (group.column || paper.group('columns', group));

                targetGroup = plotGroup;

                //draw plots
                for (i = 0; i < ln; i += 1) {
                    set = data[i];
                    y = set.y;
                    setElem = hotElem = null;

                    if (y === null) {
                        if ((plotItem = plotItems[i])) {
                            setElem = plotItem.graphic;
                            if (!is3D) {
                                setElem.attr({
                                    height: 0
                                });
                            }
                        }
                    }
                    // when valid value
                    else {
                        x = pluckNumber(set.x, i);
                        setLink = set.link;

                        fixedWidth = set._FCW * groupMaxWidth;

                        xPos = xAxis.getAxisPosition(x);
                        previousY = set.previousY;
                        previousYPos = yAxis.getAxisPosition(previousY);
                        yPos = yAxis.getAxisPosition(y);
                        highPos = yAxis.getAxisPosition(set.high);
                        lowPos = yAxis.getAxisPosition(set.low);

                        height = mathAbs(yPos - previousYPos);
                        width = fixedWidth || columnWidth;

                        halfW = yPos < previousYPos ? xPosOffset : xPosOffset;

                        path = [M, xPos, lowPos, L, xPos, highPos,
                            M, xPos, yPos, L, (xPos + halfW), yPos,
                            M, xPos, previousYPos, L, (xPos - halfW), previousYPos
                        ];

                        if (!(plotItem = plotItems[i])) {
                            plotItem = plotItems[i] = {
                                index: i,
                                value: y,
                                graphic: paper.path(path, group),
                                dataLabel: null,
                                tracker: null
                            };
                        }
                        setElem = plotItem.graphic;

                        setElem.attr({
                            path: path,
                            fill: toRaphaelColor(set.color),
                            stroke: toRaphaelColor(set.borderColor),
                            'stroke-width': set.borderWidth,
                            'stroke-dasharray': set.dashStyle,
                            'stroke-linecap': 'round',
                            'stroke-linejoin': 'round',
                            'shape-rendering': CRISP,
                            'cursor': setLink ? 'pointer' : '',
                            'visibility': seriesVisibility
                        })
                            .shadow(seriesOptions.shadow || set.shadow);

                        chart.drawTracker &&
                            chart.drawTracker.call(chart, plot, dataOptions, i);
                    }

                    setElem && datasetGraphics.push(setElem);

                    chart.drawTracker &&
                        chart.drawTracker.call(chart, plot, dataOptions, i);
                }

                plot.visible = (dataOptions.visible !== false);

                return plot;
            },

            drawCanvas: function() {
                renderer['renderer.cartesian'].drawCanvas.call(this, arguments);

                // Draw the canvas for volume chart.
                if (this.options.subCharts && this.options.subCharts[0]) {
                    var chart = this,
                        options = chart.options,
                        subChart = options.subCharts && options.subCharts[0],
                        optionsChart = subChart.chart || {},
                        paper = chart.paper,
                        elements = chart.elements,
                        volumeCanvas = elements.volumeCanvas,
                        canvasTop = optionsChart.marginTop + optionsChart.top,
                        canvasLeft = optionsChart.left = optionsChart.marginLeft,
                        canvasWidth = optionsChart.width - optionsChart.marginLeft -
                            optionsChart.marginRight,
                        canvasHeight = optionsChart.height - optionsChart.marginBottom,
                        canvasBorderRadius = pluckNumber(optionsChart.plotBorderRadius, 0),
                        canvasBorderWidth = optionsChart.plotBorderWidth,
                        canvasBgColor = optionsChart.plotBackgroundColor,
                        borderWHlf = canvasBorderWidth * 0.5,
                        canvasBorderColor = optionsChart.plotBorderColor,
                        layers = chart.layers,
                        canvasLayer = layers.canvas;

                    if (!volumeCanvas) {
                        volumeCanvas = elements.volumeCanvas = paper.rect(
                            canvasLeft - borderWHlf,
                            canvasTop - borderWHlf - 1,
                            canvasWidth + canvasBorderWidth,
                            canvasHeight + canvasBorderWidth,
                            canvasBorderRadius, canvasLayer)
                            .attr({
                                fill: toRaphaelColor(canvasBgColor),
                                'stroke-width': canvasBorderWidth,
                                stroke: canvasBorderColor,
                                'stroke-linejoin': canvasBorderWidth > 2 ?
                                    'round' : 'miter',
                                'shape-rendering': 'crisp'
                            })
                            .shadow(optionsChart.plotShadow)
                            .crisp();
                        /** @todo  apply shadow; */

                    }
                }
            },

            drawTracker: function(plot, dataOptions, index) {
                var chart = this,
                    paper = chart.paper,
                    yAxis = chart.yAxis[0],
                    xAxis = chart.xAxis[0],
                    dataObj = plot.data[index],
                    yPos = yAxis.getAxisPosition(dataObj.y),
                    xPos = xAxis.getAxisPosition(pluckNumber(dataObj.x, index)),
                    plotItem = plot.items[index],
                    TRACKER_HEIGHT = hasTouch ? 40 : 20,
                    gTracker = chart.layers.tracker, //requird for series drawing

                    // Directly Accessing chart definition JSON Data
                    options = chart.options,
                    chartAttributes = chart.definition.chart,
                    seriesOptions = options.plotOptions.series,
                    numColumns = 1,
                    xAxisZeroPos = xAxis.getAxisPosition(0),
                    xAxisFirstPos = xAxis.getAxisPosition(1),
                    groupMaxWidth = xAxisFirstPos - xAxisZeroPos,
                    definedGroupPadding = chartAttributes &&
                        chartAttributes.plotspacepercent,
                    groupPadding = seriesOptions.groupPadding,
                    maxColWidth = seriesOptions.maxColWidth,
                    groupNetWidth = (1 - definedGroupPadding * 0.01) * groupMaxWidth ||
                        mathMin(
                            groupMaxWidth * (1 - groupPadding * 2),
                            maxColWidth * numColumns
                    ),
                    columnWidth = groupNetWidth / numColumns,
                    xShift = -columnWidth * 0.5,


                    elements = chart.elements,
                    canvasBBox = elements.canvas.getBBox(),
                    volumeCanvasBBox = elements.volumeCanvas && elements.volumeCanvas.getBBox(),
                    rollOverBand = elements.rollOverBand,
                    tracker = plotItem && plotItem.tracker,
                    attr = {
                        'stroke-width': columnWidth,
                        ishot: true,
                        stroke: toRaphaelColor(chart.options.chart.rollOverBandColor),
                        fill: toRaphaelColor(chart.options.chart.rollOverBandColor),
                        visibility: HIDDEN
                    };

                if (volumeCanvasBBox && tracker && !dataOptions.doNotUseBand) {
                    if (!tracker) {
                        tracker = plotItem.tracker = paper.circle(xPos, yPos,
                            TRACKER_HEIGHT, gTracker)
                            .attr({
                                'stroke-width': 0,
                                fill: TRACKER_FILL
                            });
                    }
                    tracker.data('x', xPos);

                    if (dataObj.toolText) {
                        tracker.tooltip(dataObj.toolText);
                    }

                    if (!rollOverBand) {
                        rollOverBand = elements.rollOverBand = paper.path([M, 0,
                            canvasBBox.y, L, 0, canvasBBox.y2, M, 0,
                            volumeCanvasBBox.y, L, 0, volumeCanvasBBox.y2
                        ])
                            .attr(attr);
                        chart.layers.dataset.appendChild(rollOverBand);
                        rollOverBand.toBack();
                    }

                    tracker.mouseover(function() {
                        chart.rollOver(chart, this, xShift);
                    })
                        .mouseout(function() {
                            chart.rollOut(chart);
                        });
                }
            },

            rollOver: function(chart, ele) {
                var elements = chart.elements,
                    rollOverBand = elements.rollOverBand;
                rollOverBand.transform(t + (ele.data('x')) + COMMA + 0)
                    .show();
            },

            rollOut: function(chart) {
                chart.elements.rollOverBand.hide();
            }

        }, renderer['renderer.cartesian']);

        /**
         * The renderering definition for spline plots.
         *
         * @id TypeAPI['renderer.spline']
         * @return TypeAPI
         */
        renderer('renderer.spline', {
            drawPlotSpline: function(plot, dataOptions) {
                var chart = this,
                    series = {}, //incase of class it will be this
                    paper = chart.paper,
                    elements = chart.elements,
                    options = chart.options,
                    chartOptions = options.chart,
                    seriesOptions = options.plotOptions.series,
                    style = seriesOptions.dataLabels && seriesOptions.dataLabels.style || {},
                    labelCSS = {
                        fontFamily: style.fontFamily,
                        fontSize: style.fontSize,
                        lineHeight: style.lineHeight,
                        fontWeight: style.fontWeight,
                        fontStyle: style.fontStyle
                    },
                    plotItems = plot.items,
                    datasetGraphics = plot.graphics = (plot.graphics || []),

                    plotItem,
                    xAxis = series.xAxis = chart.xAxis[dataOptions.xAxis || 0],
                    yAxis = series.yAxis = chart.yAxis[dataOptions.yAxis || 0],
                    data = plot.data,
                    seriesElements = series.elements = {
                        spline: [],
                        markers: []
                    },
                    isHidden = dataOptions.visible === false,
                    seriesVisibility = isHidden ? 'hidden' : 'visible',
                    animationDuration = isNaN(+seriesOptions.animation) &&
                        seriesOptions.animation.duration ||
                        seriesOptions.animation * 1000,

                    // tooltip options
                    tooltipOptions = options.tooltip || {},
                    isTooltip = tooltipOptions.enabled !== false,
                    chartW = chart.chartWidth,
                    chartH = chart.chartHeight,
                    animationComplete = function() {
                        lineGroup.attr({
                            'clip-rect': null
                        });
                        markerGroup.show();
                        lineShadowGroup.show();
                        anchorShadowGroup.show();
                        dataLabelsLayer.attr({
                            transform: '...t' + -chartW + COMMA + -chartH
                        });
                    },
                    i,
                    ln,
                    connectNullData = seriesOptions.connectNullData,
                    set,
                    x,
                    y,
                    setLink,
                    tooltext,
                    lastXPos,
                    lastYPos = null,
                    xPos,
                    yPos,
                    seriesLineWidth = dataOptions.lineWidth,
                    setColor,
                    setDashStyle,
                    marker,
                    markerRadius,
                    symbol,
                    setMarkerElem,
                    setLineElem,
                    anchorShadow,
                    cmrcManager,

                    // Hover settings
                    setRolloverProperties,
                    setRolloutAttr,
                    setRolloverAttr,

                    layers = chart.layers,
                    datasetLayer = layers.dataset = layers.dataset || paper.group('dataset-orphan'),
                    dataLabelsLayer = layers.datalabels = layers.datalabels || paper.group('datalables'),
                    trackerLayer = layers.tracker,
                    trackerRadius = chartOptions.anchorTrackingRadius,
                    eventArgs,

                    group,
                    lineGroupParent,
                    lineShadowGroup,
                    anchorShadowGroup,
                    lineGroup,
                    markerGroup,

                    pathArr = [],
                    valEle,
                    hotElem,
                    trackerElem,
                    arrLen,
                    lastObj,
                    imgRef,
                    imageOnLoadFN = function(x, y, marker, plotItem, eventArgs, toolText, setRollover, i) {
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

                                    trackerAttr = (hotW > imgW) ? setRolloverAttr : setRolloutAttr;

                                    plotItem.graphic = setMarkerElem = paper.image(url, markerGroup)
                                        .attr(setRolloutAttr)
                                        .css({
                                            opacity: alpha * 0.01
                                        })
                                        .data('alwaysInvisible', scale === 0)
                                        .data('setRolloverProperties', setRollover)
                                        .data('setRolloverAttr', setRolloverAttr)
                                        .data('setRolloutAttr', setRolloutAttr)
                                        .data('anchorRadius', scale)
                                        .data('anchorHoverRadius', hoverScale);

                                    datasetGraphics.push(setMarkerElem);

                                    if (setLink || isTooltip || setRollover) {
                                        hotElem = plotItem.tracker = paper.rect(trackerLayer)
                                            .attr(trackerAttr)
                                            .attr({
                                                cursor: setLink ? 'pointer' : '',
                                                stroke: TRACKER_FILL,
                                                'stroke-width': marker.lineWidth,
                                                fill: TRACKER_FILL,
                                                ishot: true,
                                                visibility: seriesVisibility
                                            })
                                            .data('eventArgs', eventArgs)
                                            .click(function(data) {
                                                var ele = this;
                                                plotEventHandler.call(ele, chart, data);
                                            })
                                            .hover(
                                                (function(plotItem) {
                                                    return function(data) {
                                                        chart.hoverPlotAnchor(this, data, ROLLOVER, plotItem,
                                                            chart);
                                                    };
                                                }(plotItem)), (function(plotItem) {
                                                return function(data) {
                                                    chart.hoverPlotAnchor(this, data, ROLLOUT, plotItem, chart);
                                                };
                                            }(plotItem))
                                                )
                                            .tooltip(toolText);
                                    }
                                    valEle = chart.drawPlotLineLabel(plot,
                                        dataOptions, i, x, y);
                                    valEle && datasetGraphics.push(valEle);
                                };
                            },
                    imageOnErrorFN = function(x, y, plotItem, eventArgs, tooltext, setRollover, i)
                    {
                        // Handle if image load error
                        return function() {
                            valEle = plotItem.dataLabel = chart.drawPlotLineLabel(plot, dataOptions, i,
                                x, y);
                            valEle && datasetGraphics.push(valEle);
                        };
                    },
                    trackerClickFN = function(data) {
                        var ele = this;
                        plotEventHandler.call(ele, chart, data);
                    },
                    getHoverEventFN = function(plotItem, hoverOutSTR) {
                        return function(data) {
                            chart.hoverPlotAnchor(this, data, hoverOutSTR, plotItem, chart);
                        };
                    };


                cmrcManager = function(curveArr, appendClosePath, endXPos, endYPos) {
                    var len = curveArr.length,
                        lastCurveCommandArr = curveArr[len - 1],
                        len2 = lastCurveCommandArr.length,
                        command = lastCurveCommandArr[0],
                        lastRecorderXPos = lastCurveCommandArr[len2 - 2];

                    //drawing can not continue with less that two cordinates
                    if (len2 < 3) {
                        return;
                    }

                    if (command === 'R' && len2 === 3) {
                        //draw a straight line instead
                        curveArr[len - 1][0] = 'L';
                    }

                    if (appendClosePath) {
                        curveArr.push(['L', lastRecorderXPos, endYPos, endXPos, endYPos, 'Z']);
                    }
                };

                //create series group
                chart.addCSSDefinition('.fusioncharts-datalabels .fusioncharts-label', labelCSS);
                dataLabelsLayer.insertAfter(datasetLayer);
                dataLabelsLayer.attr({
                    'class': 'fusioncharts-datalabels',
                    transform: '...t' + chartW + COMMA + chartH
                });
                if (animationDuration) {
                    chart.animationCompleteQueue.push({
                        fn: animationComplete,
                        scope: chart
                    });
                }

                group = datasetLayer;
                lineGroupParent = group.line || (group.line = paper.group('line-connector', group));
                lineShadowGroup = paper.group('connector-shadow', lineGroupParent);
                anchorShadowGroup = paper.group('anchor-shadow', lineGroupParent);
                lineGroup = paper.group('connector', lineGroupParent);
                markerGroup = paper.group('anchors', lineGroupParent);

                markerGroup.hide();
                lineShadowGroup.hide();
                anchorShadowGroup.hide();

                //draw data
                for (i = 0, ln = data.length; i < ln; i += 1) {
                    set = data[i];
                    y = set.y;
                    setMarkerElem = hotElem = valEle = null;

                    if (y === null) {
                        if (connectNullData === 0) {
                            lastYPos = null;
                        }

                    } else {
                        plotItem = plotItems[i] = {
                            chart: chart,
                            index: i,
                            value: y
                        };
                        x = pluckNumber(set.x, i);
                        setLink = set.link;
                        tooltext = set.tooltext || set.toolText;

                        yPos = yAxis.getAxisPosition(y);
                        xPos = xAxis.getAxisPosition(x);

                        marker = set.marker;
                        if (marker && marker.enabled) {

                            markerRadius = marker.radius;
                            anchorShadow = marker.shadow;
                            symbol = marker.symbol.split('_');

                            eventArgs = {
                                index: i,
                                link: setLink,
                                value: y,
                                displayValue: set.displayValue,
                                categoryLabel: set.categoryLabel,
                                toolText: set.toolText,
                                id: plot.userID,
                                datasetIndex: plot.index,
                                datasetName: plot.name,
                                visible: plot.visible
                            };

                            // Hover consmetics
                            setRolloutAttr = setRolloverAttr = {};
                            setRolloverProperties = set.rolloverProperties;
                            if (marker.imageUrl) {
                                imgRef = new win.Image();
                                imgRef.onload = imageOnLoadFN(xPos, yPos, marker, plotItem, eventArgs, tooltext,
                                    setRolloverProperties, i);

                                imgRef.onerror = imageOnErrorFN(xPos, yPos, plotItem, i);
                                imgRef.src = marker.imageUrl;
                            } else {
                                if (setRolloverProperties) {
                                    setRolloutAttr = {
                                        polypath: [symbol[1] || 2, xPos, yPos,
                                            marker.radius, marker.startAngle,
                                            0
                                        ],
                                        fill: toRaphaelColor(marker.fillColor),
                                        'stroke-width': marker.lineWidth,
                                        stroke: toRaphaelColor(marker.lineColor)
                                    };

                                    setRolloverAttr = {
                                        polypath: [setRolloverProperties.sides || 2,
                                            xPos, yPos,
                                            setRolloverProperties.radius,
                                            setRolloverProperties.startAngle,
                                            setRolloverProperties.dip
                                        ],
                                        fill: toRaphaelColor(setRolloverProperties.fillColor),
                                        'stroke-width': setRolloverProperties.lineWidth,
                                        stroke: toRaphaelColor(setRolloverProperties.lineColor)
                                    };
                                }

                                setMarkerElem = plotItem.graphic = paper.polypath(symbol[1] || 2, xPos, yPos,
                                    marker.radius, marker.startAngle, 0,
                                    markerGroup)
                                    .attr({
                                        fill: toRaphaelColor(marker.fillColor),
                                        'stroke-width': marker.lineWidth,
                                        stroke: toRaphaelColor(marker.lineColor),
                                        'cursor': setLink ? 'pointer' : '',
                                        'stroke-linecap': 'round',
                                        'stroke-linejoin': 'round',
                                        ishot: true,
                                        'visibility': markerRadius === 0 ? 'hidden' : seriesVisibility
                                    })
                                    .data('alwaysInvisible', markerRadius === 0)
                                    .data('setRolloverProperties', setRolloverProperties)
                                    .data('setRolloverAttr', setRolloverAttr)
                                    .data('setRolloutAttr', setRolloutAttr)
                                    .data('anchorRadius', markerRadius)
                                    .data('anchorHoverRadius', setRolloverProperties &&
                                        setRolloverProperties.radius)
                                    .shadow(anchorShadow || false, anchorShadowGroup);

                                if (setLink || isTooltip || setRolloverProperties) {
                                    markerRadius = mathMax(markerRadius,
                                        setRolloverProperties &&
                                        setRolloverProperties.radius || 0, trackerRadius);

                                    hotElem = paper.polypath(symbol[1] || 2, xPos, yPos,
                                        markerRadius, marker.startAngle, 0, trackerLayer)
                                        .attr({
                                            'cursor': setLink ? 'pointer' : '',
                                            stroke: TRACKER_FILL,
                                            'stroke-width': 0,
                                            ishot: true,
                                            'fill': TRACKER_FILL,
                                            visibility: seriesVisibility
                                        });
                                }

                                trackerElem = hotElem || setMarkerElem;
                                trackerElem.click(trackerClickFN);



                                (hotElem || setMarkerElem)
                                    .data('eventArgs', eventArgs)
                                    .hover(getHoverEventFN(plotItem, ROLLOVER), getHoverEventFN(plotItem, ROLLOUT))
                                    .tooltip(tooltext);
                            }
                        }

                        arrLen = pathArr.length;
                        if (lastYPos !== null) {

                            if (arrLen >= 2) {
                                pathArr[arrLen - 1].push(xPos);
                                pathArr[arrLen - 1].push(yPos);
                            } else {
                                pathArr.push(['M', lastXPos, lastYPos]);
                                pathArr.push(['R', xPos, yPos]);
                            }

                        } else if (lastYPos === null && arrLen >= 2) {
                            //Raphael Catmull-Rom Curve To fix
                            //We can not draw a curve with two datapoints
                            //If we have only 2 datapoints, we push the last one again
                            lastObj = pathArr[arrLen - 1];
                            if (lastObj[0] === 'R' && lastObj.length === 3) {
                                lastObj.push(lastObj[1]);
                                lastObj.push(lastObj[2]);
                            }
                            pathArr.push(['M', xPos, yPos]);
                            pathArr.push(['R']);
                        }

                        setMarkerElem && datasetGraphics.push(setMarkerElem);

                        trackerElem && datasetGraphics.push(trackerElem);

                        lastXPos = xPos;
                        lastYPos = yPos;
                        setColor = set.color;
                        setDashStyle = set.dashStyle;

                        seriesElements.markers.push(setMarkerElem);

                        //plotItem.graphic = setMarkerElem;
                        plotItem.dataLabel = valEle;
                        plotItem.tracker = trackerElem;

                        !(marker && marker.imageUrl) && (valEle = chart.drawPlotLineLabel(plot,
                            dataOptions, i, xPos, yPos));

                        valEle && datasetGraphics.push(valEle);

                        chart.drawTracker &&
                            chart.drawTracker.call(chart, plot, dataOptions, i);

                    }
                }

                //Draw only if path array has data to draw
                if (pathArr.length >= 2) {
                    //need to check for the limitation of drawing catmull-rom curve
                    //with two data points
                    cmrcManager(pathArr, false);
                    setLineElem = plot.graphic = paper.path(pathArr, lineGroup).attr({
                        'stroke-dasharray': setDashStyle,
                        'stroke-width': seriesLineWidth,
                        'stroke': toRaphaelColor(setColor),
                        'stroke-linecap': 'round',
                        'stroke-linejoin': 'round',
                        'visibility': seriesVisibility
                    })
                    .shadow(seriesOptions.shadow && set.shadow, lineShadowGroup);

                    seriesElements.spline.push(setLineElem);

                    group.shadow(seriesOptions.shadow || set.shadow);
                }

                // clip-canvas animation to sline chart
                if (animationDuration) {
                    lineGroup.attr({
                        'clip-rect': elements['clip-canvas-init']
                    })
                        .animate({
                            'clip-rect': elements['clip-canvas']
                        }, animationDuration, 'normal', chart.getAnimationCompleteFn());
                } else {
                    animationComplete && animationComplete();
                    // Remove animation complete callback function, so that
                    // this will be called only once
                    animationComplete = undefined;
                }

                setLineElem && datasetGraphics.push(setLineElem);

                plot.visible = !isHidden;

                return plot;
            },

            drawPlotAreaspline: function(plot, dataOptions) {
                var chart = this,
                    series = {},
                    paper = chart.paper,
                    layers = chart.layers,
                    options = chart.options,
                    chartOptions = options.chart,
                    elements = chart.elements,
                    seriesOptions = options.plotOptions.series,
                    style = seriesOptions.dataLabels && seriesOptions.dataLabels.style || {},
                    labelCSS = {
                        fontFamily: style.fontFamily,
                        fontSize: style.fontSize,
                        lineHeight: style.lineHeight,
                        fontWeight: style.fontWeight,
                        fontStyle: style.fontStyle
                    },

                    xAxis = series.xAxis = chart.xAxis[dataOptions.xAxis || 0],
                    yAxis = series.yAxis = chart.yAxis[dataOptions.yAxis || 0],
                    data = plot.data,
                    seriesElements = series.elements = {
                        splineArea: [],
                        spline: [],
                        markers: []
                    },
                    isHidden = dataOptions.visible === false,
                    seriesVisibility = isHidden ? 'hidden' : 'visible',
                    animationDuration = isNaN(+seriesOptions.animation) &&
                        seriesOptions.animation.duration ||
                        seriesOptions.animation * 1000,
                    // Directly Accessing chart definition JSON Data
                    chartAttributes = chart.definition.chart,
                    // decides whether a separate line over area will be drawn and
                    // area boder will be hidden
                    isOnlyLineBorder = chartAttributes.drawfullareaborder === '0',


                    // tooltip options
                    tooltipOptions = options.tooltip || {},
                    isTooltip = tooltipOptions.enabled !== false,

                    set,
                    x,
                    y,
                    setLink,
                    tooltext,
                    xPos,
                    yPos,
                    plotItems = plot.items,
                    datasetGraphics = plot.graphics = (plot.graphics || []),
                    lastYPos = null,
                    lastXPos,
                    startXPos,
                    yMax = yAxis.max,
                    yMin = yAxis.min,
                    yBase = yMax > 0 && yMin > 0 ? yMin :
                        (yMax < 0 && yMin < 0 ? yMax : 0),
                    yBasePos = yAxis.getAxisPosition(yBase),
                    trackerLayer = layers.tracker,
                    datasetLayer = seriesElements.group = layers.dataset =
                        layers.dataset || paper.group('dataset-orphan'),
                    dataLabelsLayer = layers.datalabels = layers.datalabels ||
                        paper.group('datalabels').insertAfter(datasetLayer),
                    trackerRadius = chartOptions.anchorTrackingRadius,
                    chartW = chart.chartWidth,
                    chartH = chart.chartHeight,
                    animationComplete = function() {
                        areaGroup.attr({
                            'clip-rect': null
                        });
                        anchorGroup.show();
                        anchorShadowGroup.show();
                        dataLabelsLayer.attr({
                            transform: '...t' + -chartW + COMMA + -chartH
                        });
                    },

                    group,
                    lineGroupParent,
                    lineShadowGroup,
                    anchorShadowGroup,
                    lineGroup,
                    anchorGroup,
                    areaGroup,

                    splineAreaElem,
                    splineElem,
                    markerRadius,
                    i,
                    num,
                    pathArr = [],
                    linePathArr = [],
                    arrLen,
                    lineArrLen,
                    lastObj,
                    lastArrLength,
                    cmrcManager,
                    marker,
                    symbol,
                    setMarkerElem,
                    hotElem,
                    trackerElem,
                    valEle,
                    setColor,
                    setDashStyle,
                    areaAnimation,

                    // Hover settings
                    setRolloverProperties,
                    setRolloutAttr,
                    setRolloverAttr,

                    anchorShadow,
                    imgRef,
                    plotItem,
                    eventArgs,
                    imageOnLoadFN = function(x, y, marker, plotItem, eventArgs, toolText, setRollover, i) {
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

                            trackerAttr = (hotW > imgW) ? setRolloverAttr : setRolloutAttr;

                            plotItem.graphic = setMarkerElem = paper.image(url, anchorGroup)
                                .attr(setRolloutAttr)
                                .css({
                                    opacity: alpha * 0.01
                                })
                                .data('alwaysInvisible', scale === 0)
                                .data('setRolloverProperties', setRollover)
                                .data('setRolloverAttr', setRolloverAttr)
                                .data('setRolloutAttr', setRolloutAttr)
                                .data('anchorRadius', scale)
                                .data('anchorHoverRadius', hoverScale);

                            datasetGraphics.push(setMarkerElem);

                            if (setLink || isTooltip || setRollover) {
                                hotElem = plotItem.tracker = paper.rect(trackerLayer)
                                    .attr(trackerAttr)
                                    .attr({
                                        cursor: setLink ? 'pointer' : '',
                                        stroke: TRACKER_FILL,
                                        'stroke-width': marker.lineWidth,
                                        fill: TRACKER_FILL,
                                        ishot: true,
                                        visibility: seriesVisibility
                                    })
                                    .data('eventArgs', eventArgs)
                                    .click(function(data) {
                                        var ele = this;
                                        plotEventHandler.call(ele, chart, data);
                                    })
                                    .hover(
                                        (function(plotItem) {
                                            return function(data) {
                                                chart.hoverPlotAnchor(this, data, ROLLOVER, plotItem,
                                                    chart);
                                            };
                                        }(plotItem)), (function(plotItem) {
                                            return function(data) {
                                                chart.hoverPlotAnchor(this, data, ROLLOUT, plotItem, chart);
                                            };
                                        }(plotItem))
                                )
                                    .tooltip(toolText);
                            }
                            valEle = plotItem.dataLabel = chart.drawPlotLineLabel(plot, dataOptions, i,
                                x, y);
                            valEle && datasetGraphics.push(valEle);
                        };
                    },
                    imgLoadErrorFN = function(x, y,plotItem, i) {
                        // Handle if image load error
                        return function() {
                            valEle = plotItem.dataLabel = chart.drawPlotLineLabel(plot, dataOptions, i,
                                x, y);
                            valEle && datasetGraphics.push(valEle);
                        };
                    },
                    trackerClickFN = function(data) {
                        var ele = this;
                        plotEventHandler.call(ele, chart, data);
                    },
                    getHoverFN = function(plotItem, hoverEventStr) {
                        return function(data) {
                            chart.hoverPlotAnchor(this, data, hoverEventStr, plotItem, chart);
                        };
                    };

                //This function manages the limitation of drawing a Catmull-Rom-Curve
                //with 2 points. It copy the last data point and push in order to complete
                //drawing.
                cmrcManager = function(curveArr, appendClosePath, endXPos, endYPos) {
                    var len = curveArr.length,
                        lastCurveCommandArr = curveArr[len - 1],
                        len2 = lastCurveCommandArr.length,
                        command = lastCurveCommandArr[0],
                        lastRecorderXPos = lastCurveCommandArr[len2 - 2];

                    //drawing can not continue with less that two cordinates
                    if (len2 < 3) {
                        return;
                    }

                    if (command === 'R' && len2 === 3) {
                        //draw a straight line instead
                        curveArr[len - 1][0] = 'L';
                    }

                    if (appendClosePath) {
                        curveArr.push(['L', lastRecorderXPos, endYPos, endXPos, endYPos, 'Z']);
                    }
                };

                group = datasetLayer;
                areaGroup = group.area = (group.area || paper.group('area', group));
                lineGroupParent = group.line || (group.line = paper.group('line-connector', group));
                lineShadowGroup = paper.group('connector-shadow', lineGroupParent);
                anchorShadowGroup = paper.group('anchor-shadow', lineGroupParent);
                lineGroup = paper.group('area-connector', lineGroupParent);
                anchorGroup = paper.group('area-anchors', lineGroupParent);

                //initially hide the anchor group
                anchorGroup.hide();
                anchorShadowGroup.hide();
                chart.addCSSDefinition('.fusioncharts-datalabels .fusioncharts-label', labelCSS);
                dataLabelsLayer.insertAfter(datasetLayer);
                dataLabelsLayer.attr({
                    'class': 'fusioncharts-datalabels',
                    transform: '...t' + chartW + COMMA + chartH
                });

                if (animationDuration) {
                    chart.animationCompleteQueue.push({
                        fn: animationComplete,
                        scope: chart
                    });
                }

                //draw data
                for (i = 0, num = data.length; i < num; i += 1) {
                    set = data[i];
                    y = set.y;
                    arrLen = pathArr.length;
                    lineArrLen = linePathArr.length;
                    setMarkerElem = hotElem = valEle = null;

                    //last inserted path cordinates
                    if (arrLen >= 2) {
                        lastObj = pathArr[arrLen - 1];
                        lastArrLength = lastObj.length;
                    }

                    if (y === null) {
                        if (seriesOptions.connectNullData === 0) {
                            lastYPos = null;
                        }
                    } else {
                        plotItem = plotItems[i] = {
                            chart: chart,
                            index: i,
                            value: y
                        };
                        x = pluckNumber(set.x, i);
                        setLink = set.link;
                        tooltext = set.tooltext || set.toolText;
                        xPos = xAxis.getAxisPosition(x);
                        yPos = yAxis.getAxisPosition(y);


                        marker = set.marker;
                        if (marker && marker.enabled) {

                            eventArgs = {
                                index: i,
                                link: setLink,
                                value: set.y,
                                displayValue: set.displayValue,
                                categoryLabel: set.categoryLabel,
                                toolText: tooltext,
                                id: plot.userID,
                                datasetIndex: plot.index,
                                datasetName: plot.name,
                                visible: plot.visible
                            };

                            markerRadius = marker.radius;
                            anchorShadow = marker.shadow;
                            symbol = marker.symbol.split('_');

                            // Hover consmetics
                            setRolloutAttr = setRolloverAttr = {};
                            setRolloverProperties = set.rolloverProperties;
                            if (marker.imageUrl) {
                                imgRef = new win.Image();
                                imgRef.onload = imageOnLoadFN(xPos, yPos, marker, plotItem, eventArgs, tooltext,
                                    setRolloverProperties, i);

                                imgRef.onerror = imgLoadErrorFN(xPos, yPos, plotItem, i);
                                imgRef.src = marker.imageUrl;
                            } else {
                                if ((setRolloverProperties = set.rolloverProperties)) {
                                    setRolloutAttr = {
                                        polypath: [symbol[1] || 2, xPos, yPos,
                                            markerRadius, marker.startAngle,
                                            0
                                        ],
                                        fill: toRaphaelColor(marker.fillColor),
                                        'stroke-width': marker.lineWidth,
                                        stroke: toRaphaelColor(marker.lineColor)
                                    };

                                    setRolloverAttr = {
                                        polypath: [setRolloverProperties.sides || 2,
                                            xPos, yPos,
                                            setRolloverProperties.radius,
                                            setRolloverProperties.startAngle,
                                            setRolloverProperties.dip
                                        ],
                                        fill: toRaphaelColor(setRolloverProperties.fillColor),
                                        'stroke-width': setRolloverProperties.lineWidth,
                                        stroke: toRaphaelColor(setRolloverProperties.lineColor)
                                    };
                                }

                                setMarkerElem = plotItem.graphic = paper.polypath(symbol[1] || 2, xPos, yPos,
                                    markerRadius, marker.startAngle, 0,
                                    anchorGroup)
                                    .attr({
                                        fill: toRaphaelColor(marker.fillColor),
                                        'stroke-width': marker.lineWidth,
                                        stroke: toRaphaelColor(marker.lineColor),
                                        'stroke-linecap': 'round',
                                        'cursor': setLink ? 'pointer' : '',
                                        ishot: true,
                                        'visibility': markerRadius === 0 ? 'hidden' : seriesVisibility
                                    })
                                    .data('alwaysInvisible', markerRadius === 0)
                                    .data('setRolloverProperties', setRolloverProperties)
                                    .data('setRolloverAttr', setRolloverAttr)
                                    .data('setRolloutAttr', setRolloutAttr)
                                    .data('anchorRadius', markerRadius)
                                    .data('anchorHoverRadius', setRolloverProperties &&
                                        setRolloverProperties.radius)
                                    .shadow(anchorShadow || false, anchorShadowGroup);

                                if (setLink || isTooltip || setRolloverProperties) {
                                    markerRadius = mathMax(markerRadius,
                                        setRolloverProperties &&
                                        setRolloverProperties.radius || 0, trackerRadius);

                                    hotElem = paper.polypath(symbol[1] || 2, xPos, yPos,
                                        markerRadius, marker.startAngle, 0, trackerLayer)
                                        .attr({
                                            'cursor': setLink ? 'pointer' : '',
                                            stroke: TRACKER_FILL,
                                            'stroke-width': 0,
                                            ishot: true,
                                            'fill': TRACKER_FILL,
                                            'visibility': seriesVisibility
                                        });
                                }

                                (hotElem || setMarkerElem)
                                    .data('eventArgs', eventArgs)
                                    .click(trackerClickFN)
                                    .hover(getHoverFN(plotItem, ROLLOVER), getHoverFN(plotItem, ROLLOUT))
                                    .tooltip(tooltext);
                            }
                        }

                        seriesElements.markers[i] = [setMarkerElem];

                        if (lastYPos !== null) {
                            //This means we have a two consecutive valid points
                            //and we will draw a curve.
                            if (arrLen >= 2) {
                                //This means atleast one command with two values has been inserted.
                                //If the last inserted command is not a Catmull-Rom curve command R
                                //we have to push one.
                                if (pathArr[arrLen - 1][0] === 'M') {
                                    pathArr.push(['R']);
                                }
                                //line
                                if (linePathArr[lineArrLen - 1][0] === 'M') {
                                    linePathArr.push(['R']);
                                }
                                //update properties
                                arrLen = pathArr.length;
                                lineArrLen = linePathArr.length;
                                lastObj = pathArr[arrLen - 1];
                                lastArrLength = lastObj.length;
                                pathArr[arrLen - 1].push(xPos);
                                pathArr[arrLen - 1].push(yPos);
                                //
                                linePathArr[lineArrLen - 1].push(xPos);
                                linePathArr[lineArrLen - 1].push(yPos);
                                //Now for all area charts we need to close path when drawing ends
                                //In this case if we have reached the end of data, we close.
                                if (i === (num - 1)) {
                                    //End of drawing
                                    //Conncet only if the last command is a curve
                                    if (lastObj[0] === 'R') {
                                        //apply Catmull-Rom-Curve management.
                                        cmrcManager(pathArr, true, startXPos, yBasePos);
                                        cmrcManager(linePathArr, false);
                                    }
                                }
                            } else {
                                //first start
                                pathArr.push(['M', lastXPos, lastYPos]);
                                pathArr.push(['R', xPos, yPos]);
                                //line
                                linePathArr.push(['M', lastXPos, lastYPos]);
                                linePathArr.push(['R', xPos, yPos]);
                                //store the staring x position
                                //this will be nedded to close the line
                                startXPos = lastXPos;
                            }
                        } else if (lastYPos === null && arrLen >= 2) {
                            //Raphael Catmull-Rom Curve To fix
                            //We can not draw a curve with two datapoints
                            //If we have only 2 datapoints, we push the last one again
                            if (lastObj[0] === 'R') {
                                cmrcManager(pathArr, true, startXPos, yBasePos);
                                cmrcManager(linePathArr, false);
                            }

                            pathArr.push(['M', xPos, yPos]);
                            linePathArr.push(['M', xPos, yPos]);
                            startXPos = xPos;
                        }

                        setMarkerElem && datasetGraphics.push(setMarkerElem);

                        trackerElem && datasetGraphics.push(trackerElem);

                        chart.drawTracker &&
                            chart.drawTracker.call(chart, plot, dataOptions, i);

                        plotItem.graphic = setMarkerElem;
                        plotItem.dataLabel = valEle;
                        plotItem.tracker = trackerElem;

                        !(marker && marker.imageUrl) && (valEle = chart.drawPlotLineLabel(plot,
                            dataOptions, i, xPos, yPos));
                        valEle && datasetGraphics.push(valEle);

                        chart.drawTracker &&
                            chart.drawTracker.call(chart, plot, dataOptions, i);

                        lastXPos = xPos;
                        lastYPos = yPos;
                        setColor = set.color;
                        setDashStyle = set.dashStyle;

                    }

                }

                //if the line is Drawn [R] not closed [!Z] and we have reached the end,
                //we need to close the path with the previous one
                lastObj = pathArr[pathArr.length - 1];
                if (lastObj) {
                    lastArrLength = lastObj.length;
                    if (lastObj[lastArrLength - 1] !== 'Z' && lastObj[0] === 'R') {
                        //apply Catmull-Rom-Curve management.
                        cmrcManager(pathArr, true, startXPos, yBasePos);
                        cmrcManager(linePathArr, false);
                    }
                }


                //draw only if we have data to be drawn
                if (pathArr.length >= 2) {
                    splineAreaElem = paper.path(pathArr, areaGroup).attr({
                        fill: toRaphaelColor(dataOptions.fillColor),
                        'stroke-dasharray': dataOptions.dashStyle,
                        'stroke-width': isOnlyLineBorder ? 0 : dataOptions.lineWidth,
                        'stroke': toRaphaelColor(dataOptions.lineColor),
                        'stroke-linecap': 'round',
                        visibility: seriesVisibility
                    }).shadow(seriesOptions.shadow && set.shadow);

                    seriesElements.splineArea = plot.graphic = splineAreaElem;

                    datasetGraphics.push(splineAreaElem);

                    if (animationDuration) {
                        // clip-canvas animation to area chart
                        areaAnimation = areaGroup.attr({
                            'clip-rect': elements['clip-canvas-init']
                        })
                            .animate({
                                'clip-rect': elements['clip-canvas']
                            }, animationDuration, 'normal', chart.getAnimationCompleteFn());

                    } else {
                        animationComplete && animationComplete();
                        // Remove animation complete callback function, so that
                        // this will be called only once
                        animationComplete = undefined;
                    }
                }

                if (isOnlyLineBorder) {

                    if (linePathArr.length >= 2) {
                        splineElem = paper.path(linePathArr, lineGroup).attr({
                            stroke: toRaphaelColor(dataOptions.lineColor),
                            'stroke-width': dataOptions.lineWidth,
                            'stroke-dasharray': set.dashStyle || dataOptions.dashStyle,
                            'stroke-linecap': 'round',
                            visibility: seriesVisibility
                        }).shadow(seriesOptions.shadow || set.shadow);

                        seriesElements.spline = splineElem;
                    }

                    datasetGraphics.push(splineElem);

                    if (animationDuration) {
                        lineGroup.attr({
                            'clip-rect': elements['clip-canvas-init']
                        })
                            .animateWith(
                                areaGroup, areaAnimation, {
                                'clip-rect': elements['clip-canvas']
                            },
                                animationDuration,
                                'normal'
                        );
                    }
                }

                plot.visible = !isHidden;

                return plot;
            }
        }, renderer['renderer.cartesian']);

        renderer('renderer.kagi', {
            drawPlotKagi: function(plot, dataOptions) {
                var chart = this,
                    paper = chart.paper,
                    options = chart.options,
                    elements = chart.elements,
                    data = plot.data,
                    seriesOptions = options.plotOptions.series,
                    xAxis = chart.xAxis[dataOptions.xAxis || 0],
                    yAxis = chart.yAxis[dataOptions.yAxis || 0],
                    canvasPadding = dataOptions.canvasPadding,
                    xShiftLength = dataOptions.xShiftLength,
                    plotItems = plot.items,
                    logic = chart.logic,
                    seriesVisibility = dataOptions.visible === false ?
                        'hidden' : 'visible',
                    // tooltip options
                    tooltipOptions = options.tooltip || {},
                    isTooltip = tooltipOptions.enabled !== false,
                    rallyAttr = {
                        stroke: toRaphaelColor({
                            color: dataOptions.rallyColor,
                            alpha: dataOptions.rallyAlpha
                        }),
                        'stroke-linecap': 'round',
                        'stroke-linejoin': 'round',
                        'stroke-width': dataOptions.rallyThickness ||
                            dataOptions.lineWidth,
                        'stroke-dasharray': dataOptions.rallyDashed
                    },
                    declineAttr = {
                        stroke: toRaphaelColor({
                            color: dataOptions.declineColor,
                            alpha: dataOptions.declineAlpha
                        }),
                        'stroke-linecap': 'round',
                        'stroke-linejoin': 'round',
                        'stroke-width': dataOptions.declineThickness ||
                            dataOptions.lineWidth,
                        'stroke-dasharray': dataOptions.declineDashed
                    },
                    thickness = {
                        'true': rallyAttr['stroke-width'],
                        'false': declineAttr['stroke-width']
                    },
                    layers = chart.layers,
                    datasetLayer = layers.dataset = layers.dataset ||
                        paper.group('dataset-orphan'),
                    dataLabelsLayer = layers.datalabels = layers.datalabels ||
                        paper.group('datalabels').insertAfter(datasetLayer),
                    trackerLayer = layers.tracker,
                    animationDuration = isNaN(+seriesOptions.animation) &&
                        seriesOptions.animation.duration ||
                        seriesOptions.animation * 1000,
                    clipCanvasInit = elements['clip-canvas-init'].slice(0),
                    clipCanvas = elements['clip-canvas'].slice(0),
                    xValue = 0,
                    plotX = xAxis.getAxisPosition(xValue),
                    chartW = chart.chartWidth,
                    chartH = chart.chartHeight,
                    animationComplete = function() {
                        lineGroup.attr({
                            'clip-rect': null
                        });
                        anchorShadowGroup.show();
                        anchorGroup.show();
                        dataLabelsLayer.attr({
                            transform: '...t' + -chartW + COMMA + -chartH
                        });
                    },
                    rallyPath = [],
                    declinePath = [],
                    setLink,
                    anchorRadius,
                    tooltext,
                    lineElem,
                    hotElem,
                    trackerElem,
                    valEle,
                    marker,
                    symbol,
                    setMarkerElem,
                    i,
                    num,
                    isRally,
                    point,
                    yValue,
                    startX,
                    plotY,
                    crispY,
                    xPos,
                    yPos,
                    lastPoint,
                    lastHigh,
                    lastLow,
                    isRallyInitialised,
                    setShadow,
                    nextPoint,
                    nextPointIsRally,
                    path,
                    markerEnabled,
                    trackerRadius = options.chart.anchorTrackingRadius,
                    eventArgs,
                    group,
                    lineGroupParent,
                    lineShadowGroup,
                    anchorShadowGroup,
                    lineGroup,
                    anchorGroup,
                    anchorShadow,
                    setRolloutAttr,
                    setRolloverAttr,
                    setRolloverProperties,
                    dip,
                    markerRadius,
                    imgRef;

                if (data.length) {
                    //create series group
                    group = datasetLayer;
                    lineGroupParent = group.line || (group.line = paper.group('line-connector', group));
                    lineShadowGroup = paper.group('connector-shadow', lineGroupParent);
                    anchorShadowGroup = paper.group('anchor-shadow', lineGroupParent);
                    lineGroup = paper.group('connector', lineGroupParent);
                    anchorGroup = paper.group('anchors', lineGroupParent);

                    anchorGroup.hide();
                    anchorShadowGroup.hide();

                    dataLabelsLayer.attr({
                        transform: '...t' + chartW + COMMA + chartH
                    });
                    if (animationDuration) {
                        chart.animationCompleteQueue.push({
                            fn: animationComplete,
                            scope: this
                        });
                    }

                    isRally = !! data[0].isRally;
                    //previous translate function
                    for (i = 0, num = data.length; i < num; i += 1) {
                        // Create the object first as one index may contain
                        // multiple line
                        plotItems[i] = {
                            chart: chart,
                            index: i,
                            graphic: null,
                            line: [],
                            dataLabel: null,
                            tracker: null
                        };

                        point = data[i];
                        yValue = point.y;

                        if (!point.isDefined) {
                            yValue = point.plotValue;
                        }

                        // Getting appropiate value for the current plot point.
                        yValue = pluck(point.plotValue, yValue);

                        // Set the y position.
                        point.plotY = toPrecision(yAxis.getAxisPosition(point.y), 2);

                        // Store value textbox y position.
                        point.graphY = toPrecision(yAxis.getAxisPosition(yValue), 2);

                        // Abscissa of the point on the kagi line.
                        point.plotX = plotX;

                        // If there is a horizontal shift, then abscissa of the kagi
                        // line and as such all points on it shifts to the right by a
                        // slab more.
                        if (point.isShift) {
                            xValue += 1;
                            plotX = xAxis.getAxisPosition(xValue);
                        }

                        if (i) {
                            lastPoint = data[i - 1];

                            // Getting the previously bundled up properties in local
                            // variables.
                            isRally = point && point.objParams && point.objParams.isRally;
                            lastHigh = point && point.objParams && point.objParams.lastHigh;
                            lastLow = point && point.objParams && point.objParams.lastLow;
                            isRallyInitialised = point && point.objParams &&
                                point.objParams.isRallyInitialised;

                            // To find if there is a change in trend towards the current
                            // plot.
                            if (lastPoint && isRallyInitialised &&
                                lastPoint.isRally !== point.isRally) {

                                // Setting in this.data for the plot, to be used for.
                                // Setting the color/thickness the graph segments.
                                point.isChanged = true;

                                // To get the pixel position of the transtion point and
                                // storing in data point for the plot.
                                point.ty = toPrecision(yAxis.getAxisPosition((isRally ?
                                    lastHigh : lastLow)), 2);
                            } else {
                                // Setting in this.data for the plot.
                                point.isChanged = false;
                            }
                        }
                    }
                    //end of previous translation

                    //draw graph
                    startX = chart.canvasLeft + canvasPadding;
                    plotX = startX + xShiftLength / 2;
                    plotY = data[0].plotY;
                    isRally = !! data[0].isRally;
                    setShadow = data[0].shadow;
                    //drawing starts with an initial half horizontal-shift
                    crispY = mathRound(plotY) + (thickness[isRally] % 2 / 2);
                    if (isRally) {
                        rallyPath.push(M, startX, crispY, H, plotX);
                    } else {
                        declinePath.push(M, startX, crispY, H, plotX);
                    }

                    each(data, function(point, i) {
                        //looping to draw the plots
                        nextPoint = data[i + 1];
                        if (nextPoint) {
                            path = [M, plotX, plotY];
                            isRally = point.isRally;
                            //if there is a shift corresponding to this point
                            if (point.isShift) {
                                plotX += xShiftLength;
                                plotY = point.graphY;
                                path.push(H, plotX);
                                path[2] = mathRound(path[2]) +
                                    (thickness[isRally] % 2 / 2);
                                path = path.toString();
                                //draw the path
                                if (isRally) {
                                    rallyPath.push(path);
                                } else {
                                    declinePath.push(path);
                                }
                                path = [M, plotX, plotY];
                            }
                            //if there is a change in trend between the current and
                            //the next points
                            if (nextPoint.isChanged) {
                                plotY = nextPoint.ty;
                                path.push(V, plotY);
                                path[1] = mathRound(path[1]) +
                                    (thickness[isRally] % 2 / 2);
                                path = path.toString();
                                if (isRally) {
                                    rallyPath.push(path);
                                } else {
                                    declinePath.push(path);
                                }
                                path = [M, plotX, plotY];
                            }

                            nextPointIsRally = nextPoint.isRally;
                            /** @todo: If path contains move to and line to at the
                             * same point line is not visible in native VML brewers
                             * need to remove this code when this issue in fixed in
                             * core.
                             */

                            if (nextPoint.graphY !== path[2]) {
                                path.push(V, nextPoint.graphY);
                                path[1] = mathRound(path[1]) +
                                    (thickness[nextPointIsRally] % 2 / 2);
                                path = path.toString();
                                if (nextPointIsRally) {
                                    rallyPath.push(path);
                                } else {
                                    declinePath.push(path);
                                }
                            }
                            //updating value
                            plotY = nextPoint.graphY;
                        }

                        xPos = point.plotX;
                        yPos = point.plotY;
                        marker = point.marker;
                        anchorRadius = marker && marker.radius;
                        markerEnabled = marker.enabled;
                        setLink = point && point.link;
                        tooltext = point && point.toolText;

                        if (yPos !== UNDEFINED && !isNaN(yPos) && point.isDefined) {

                            symbol = marker.symbol.split('_');
                            dip = symbol[0] === 'spoke' ? 1 : 0;
                            markerRadius = marker.radius;
                            anchorShadow = marker.shadow;

                            eventArgs = {
                                index: i,
                                link: setLink,
                                value: point.y,
                                displayValue: point.displayValue,
                                categoryLabel: point.categoryLabel,
                                toolText: tooltext,
                                id: plot.userID,
                                datasetIndex: plot.index,
                                datasetName: plot.name,
                                visible: plot.visible
                            };


                            // Hover consmetics
                            setRolloutAttr = setRolloverAttr = {};
                            setRolloverProperties = point.rolloverProperties;

                            if (marker.imageUrl) {
                                imgRef = new win.Image();
                                imgRef.onload = (function(x, y, marker, plotItem, eventArgs, toolText, setRollover, i) {
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

                                        trackerAttr = (hotW > imgW) ? setRolloverAttr : setRolloutAttr;

                                        plotItem.graphic = setMarkerElem = paper.image(url, anchorGroup)
                                            .attr(setRolloutAttr)
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
                                            hotElem = plotItem.tracker = paper.rect(trackerLayer)
                                                .attr(trackerAttr)
                                                .attr({
                                                    cursor: setLink ? 'pointer' : '',
                                                    stroke: TRACKER_FILL,
                                                    'stroke-width': marker.lineWidth,
                                                    fill: TRACKER_FILL,
                                                    ishot: true,
                                                    visibility: seriesVisibility
                                                })
                                                .data('eventArgs', eventArgs)
                                                .click(function(data) {
                                                    var ele = this;
                                                    plotEventHandler.call(ele, chart, data);
                                                })
                                                .hover(
                                                    (function(plotItem) {
                                                        return function(data) {
                                                            chart.hoverPlotAnchor(this, data, ROLLOVER, plotItem,
                                                                chart);
                                                        };
                                                    }(plotItem)), (function(plotItem) {
                                                        return function(data) {
                                                            chart.hoverPlotAnchor(this, data, ROLLOUT, plotItem, chart);
                                                        };
                                                    }(plotItem))
                                            )
                                                .tooltip(toolText);
                                        }
                                        valEle = plotItem.dataLabel = chart.drawPlotKagiLabel(plot, dataOptions, i,
                                            x, y);
                                    };
                                })(xPos, yPos, marker, plotItems[i], eventArgs, tooltext, setRolloverProperties, i);

                                imgRef.onerror = (function(x, y, marker, plotItem, eventArgs, toolText, setRollover, i)
                                    {
                                    // Handle if image load error
                                    return function() {
                                        valEle = plotItem.dataLabel = chart.drawPlotKagiLabel(plot, dataOptions, i,
                                            x, y);
                                    };
                                })(xPos, yPos, marker, plotItems[i], eventArgs, tooltext, setRolloverProperties, i);
                                imgRef.src = marker.imageUrl;

                            } else {
                                if (!logic.multisetRealtime && setRolloverProperties) {
                                    setRolloutAttr = {
                                        polypath: [symbol[1] || 2, xPos, yPos,
                                            markerRadius, marker.startAngle,
                                            dip
                                        ],
                                        fill: toRaphaelColor(marker.fillColor),
                                        'stroke-width': marker.lineWidth,
                                        stroke: toRaphaelColor(marker.lineColor)
                                    };

                                    setRolloverAttr = {
                                        polypath: [setRolloverProperties.sides || 2,
                                            xPos, yPos,
                                            setRolloverProperties.radius,
                                            setRolloverProperties.startAngle,
                                            setRolloverProperties.dip
                                        ],
                                        fill: toRaphaelColor(setRolloverProperties.fillColor),
                                        'stroke-width': setRolloverProperties.lineWidth,
                                        stroke: toRaphaelColor(setRolloverProperties.lineColor)
                                    };
                                }

                                // IF anchors are disabled, we draw tracker element
                                // of radius 3px and color as transparent to be use
                                // as a tracker to show tooltip and other events
                                // if any
                                setMarkerElem = plotItems[i].graphic =
                                    paper.polypath(symbol[1] || 2, xPos, yPos,
                                        markerRadius, marker.startAngle,
                                        dip, anchorGroup)
                                    .attr({
                                        fill: toRaphaelColor(marker.fillColor),
                                        'stroke-width': marker.lineWidth,
                                        stroke: toRaphaelColor(marker.lineColor),
                                        'stroke-linecap': 'round',
                                        'cursor': setLink ? 'pointer' : '',
                                        ishot: true,
                                        'visibility': markerRadius === 0 ? 'hidden' : seriesVisibility
                                    })
                                    .data('alwaysInvisible', markerRadius === 0)
                                    .data('setRolloverProperties', setRolloverProperties)
                                    .data('setRolloverAttr', setRolloverAttr)
                                    .data('setRolloutAttr', setRolloutAttr)
                                    .data('anchorRadius', markerRadius)
                                    .data('anchorHoverRadius', setRolloverProperties &&
                                        setRolloverProperties.radius)
                                    .shadow(anchorShadow || false, anchorShadowGroup);

                                if (setLink || isTooltip) {
                                    markerRadius = mathMax(markerRadius,
                                        setRolloverProperties &&
                                        setRolloverProperties.radius || 0, trackerRadius);

                                    hotElem = paper.circle(xPos, yPos,
                                        markerRadius, trackerLayer)
                                        .attr({
                                            'cursor': setLink ? 'pointer' : '',
                                            stroke: TRACKER_FILL,
                                            ishot: true,
                                            'fill': TRACKER_FILL,
                                            'stroke-width': marker.lineWidth,
                                            'visibility': seriesVisibility
                                        })
                                        .data('eventArgs', eventArgs)
                                        .click(function(data) {
                                            var ele = this;
                                            plotEventHandler.call(ele, chart, data);
                                        })
                                        .hover((function(plotItem) {
                                            return function(data) {
                                                chart.hoverPlotAnchor(this, data, ROLLOVER, plotItem, chart);
                                            };
                                        }(plotItems[i])), (function(plotItem) {
                                            return function(data) {
                                                chart.hoverPlotAnchor(this, data, ROLLOUT, plotItem, chart);
                                            };
                                        }(plotItems[i])))
                                        .tooltip(tooltext);
                                }

                                trackerElem = plotItems[i].tracker = hotElem || setMarkerElem;

                                !(marker && marker.imageUrl) && (valEle = plotItems[i].dataLabel =
                                    chart.drawPlotKagiLabel(plot, dataOptions, i, xPos, yPos));
                            }
                            /** @todo label management for kagi need to be done
                        var labelAlign = point && point.align
                        labelAlign = labelAlign === 'left' ? 'start' :
                                     labelAlign === 'right' ? 'end' : 'center';

                        valEle.attr({
                            'text-anchor' : labelAlign
                        }) */

                        }
                    });

                    lineElem = paper.path(rallyPath, lineGroup).attr(rallyAttr)
                        .shadow(seriesOptions.shadow);
                    plotItems[0].line.push(lineElem);

                    lineElem = paper.path(declinePath, lineGroup).attr(declineAttr)
                        .shadow(seriesOptions.shadow);
                    plotItems[0].line.push(lineElem);

                    if (animationDuration) {
                        // clip-canvas animation to line chart
                        lineGroup.attr({
                            'clip-rect': clipCanvasInit
                        })
                            .animate({
                                'clip-rect': clipCanvas
                            }, animationDuration, 'normal', chart.getAnimationCompleteFn());
                    } else {
                        animationComplete && animationComplete();
                        // Remove animation complete callback function, so that
                        // this will be called only once
                        animationComplete = undefined;
                    }
                }
            },

            drawPlotKagiLabel: function(plot, dataOptions, i, xPos, yPos, dataLabelsLayer) {

                var chart = this,
                    options = chart.options,
                    chartOptions = options.chart,
                    seriesOptions = options.plotOptions.series,
                    paper = chart.paper,
                    layers = chart.layers,
                    style = seriesOptions.dataLabels.style,
                    rotateValues = chartOptions.rotateValues === 1 ? 270 : 0,
                    canvasHeight = chart.canvasHeight,
                    canvasTop = chart.canvasTop,
                    canvasLeft = chart.canvasLeft,
                    plotItems = plot.items,
                    data = plot.data,
                    set = data[i],
                    plotItem = plotItems[i],
                    graphic = plotItem.graphic,
                    markerRadius = (graphic && graphic.type == 'image' &&
                        graphic.attr('height') * 0.5) || set.marker && set.marker.radius - 3,
                    valuePadding = chartOptions.valuePadding + GUTTER_2 + markerRadius,
                    seriesVisibility = dataOptions.visible === false ?
                        'hidden' : 'visible',
                    valEle = plotItem.dataLabel,
                    css = {
                        fontFamily: style.fontFamily,
                        fontSize: style.fontSize,
                        lineHeight: style.lineHeight,
                        fontWeight: style.fontWeight,
                        fontStyle: style.fontStyle
                    },
                    valueBelowPoint,
                    valueMiddle,
                    textAlign,
                    yAdjust,
                    topSpace,
                    bottomSpace,
                    textHeight,
                    origTextHeight,
                    placeLabelAtCenter,
                    textY,
                    bBoxObj,
                    displayValue;

                dataLabelsLayer = dataLabelsLayer || layers.datalabels;

                // Drawing of displayValue
                displayValue = set.displayValue;
                if (defined(displayValue) && displayValue !== BLANK) {
                    // First render the value text
                    if (!valEle) {

                        valEle = plotItem.dataLabel = paper.text(dataLabelsLayer)
                            .attr({
                                text: displayValue,
                                fill: style.color,
                                'text-bound': [style.backgroundColor, style.borderColor,
                                    style.borderThickness, style.borderPadding,
                                    style.borderRadius, style.borderDash
                                ]
                            })
                            .css(css);
                    } else {
                        rotateValues && valEle.rotate(360 - rotateValues);
                    }

                    valEle.attr({
                        title: (set.originalText || ''),
                        fill: style.color
                    });

                    // get the bBox to find height and width of the text.
                    bBoxObj = valEle.getBBox();

                    // If rotated values we use the width of the text as
                    // height
                    textHeight = origTextHeight = (rotateValues ? bBoxObj.width :
                        bBoxObj.height);
                    textHeight += valuePadding;
                    topSpace = yPos - canvasTop;
                    bottomSpace = (canvasTop + canvasHeight) - yPos;
                    textY = yPos;

                    textHeight = textHeight + GUTTER_4;
                    yAdjust = (origTextHeight * 0.5) + valuePadding;


                    // When the labels are in rotated mode
                    if (rotateValues) {
                        //Get the y position based on next data's position
                        placeLabelAtCenter = true;
                        if (set.vAlign === POSITION_TOP) {
                            textY -= yAdjust;
                            // If label goes out of canvas on top
                            // we place the label at center
                            placeLabelAtCenter = (yPos - canvasTop) < textHeight;
                        } else if (set.vAlign === POSITION_BOTTOM) {
                            textY += yAdjust - GUTTER_2;
                            valueBelowPoint = 1;
                            // If label goes out of canvas at bottom
                            // we place the label at center
                            placeLabelAtCenter = yPos + textHeight >
                                (canvasTop + canvasHeight);
                        }
                        // Place the label at center
                        if (placeLabelAtCenter) {
                            valueMiddle = 1;
                            xPos -= (valuePadding + 3 +
                                bBoxObj.height * 0.5);
                            textY = yPos;
                        }
                    } else {
                        //Get the y position based on next data's position
                        if (set.vAlign === POSITION_TOP) {
                            textY -= yAdjust;
                        } else if (set.vAlign === POSITION_BOTTOM) {
                            textY += yAdjust;
                            valueBelowPoint = 1;
                        } else {
                            // It the value goes out-side of canvas at
                            // left-hand side
                            if (bBoxObj.width > (xPos - canvasLeft)) {
                                textY -= yAdjust;
                            } else {
                                valueMiddle = 1;
                                xPos -= valuePadding + 3;
                                textAlign = 'end';
                            }
                        }
                    }

                    valEle.attr({
                        x: xPos,
                        y: textY,
                        'text-anchor': textAlign,
                        visibility: seriesVisibility
                    })
                        .data('isBelow', valueBelowPoint)
                        .data('isMiddle', valueMiddle);

                    rotateValues && valEle.attr('transform', 'T0,0,R' + rotateValues);
                } else if (valEle) {
                    valEle.attr({
                        text: BLANK
                    });
                }
                return valEle;
            }

        }, renderer['renderer.cartesian']);

        renderer('renderer.boxandwhisker', {
            drawPlotBoxandwhisker2d: function(plot, dataOptions) {
                var chart = this,
                    paper = chart.paper,
                    options = chart.options,
                    seriesOptions = options.plotOptions.series,
                    xAxis = chart.xAxis[dataOptions.xAxis || 0],
                    yAxis = chart.yAxis[dataOptions.xAxis || 0],
                    animationDuration = isNaN(+seriesOptions.animation) &&
                        seriesOptions.animation.duration ||
                        seriesOptions.animation * 1000,
                    layers = chart.layers,
                    datasetLayer = layers.dataset = layers.dataset ||
                        paper.group('dataset-orphan'),
                    dataLabelsLayer = layers.datalabels = layers.datalabels ||
                        paper.group('datalabels'),
                    data = dataOptions.data,
                    plotItems = plot.items || (plot.items = []),
                    seriesVisibility = dataOptions.visible === false ?
                        'hidden' : 'visible',
                    // tooltip options
                    tooltipOptions = options.tooltip || {},
                    isTooltip = tooltipOptions.enabled !== false,
                    columnPosition = dataOptions.columnPosition || 0,
                    chartAttributes = chart.definition.chart,
                    xAxisZeroPos = xAxis.getAxisPosition(0),
                    xAxisFirstPos = xAxis.getAxisPosition(1),
                    groupMaxWidth = xAxisFirstPos - xAxisZeroPos,
                    groupPadding = seriesOptions.groupPadding,
                    definedGroupPadding = chartAttributes &&
                        chartAttributes.plotspacepercent,
                    maxColWidth = seriesOptions.maxColWidth,
                    numColumns = dataOptions.numColumns || 1,
                    groupNetWidth = (1 - definedGroupPadding * 0.01) * groupMaxWidth || mathMin(groupMaxWidth * (1 -
                        groupPadding * 2),
                        maxColWidth * numColumns),
                    groupNetHalfWidth = groupNetWidth / 2,
                    columnWidth = groupNetWidth / numColumns,
                    xPosOffset = (columnPosition * columnWidth) - groupNetHalfWidth,
                    chartOptions = options.chart,
                    rotateValues = (chartOptions.rotateValues === 1) ? 270 :
                        undefined,
                    valuePadding = pluckNumber(chartOptions.valuePadding, 0),
                    upperBoxGroup = datasetLayer.upperBoxGroup =
                        datasetLayer.upperBoxGroup ||
                        paper.group('upperBox', datasetLayer),
                    lowerBoxGroup = datasetLayer.lowerBoxGroup =
                        datasetLayer.lowerBoxGroup ||
                        paper.group('lowerBox', datasetLayer),
                    medianGroup = datasetLayer.medianGroup =
                        datasetLayer.medianGroup ||
                        paper.group('median', datasetLayer),
                    datasetGraphics = plot.graphics = (plot.graphics || []),

                    displayValueElements = plotItems.displayValues = {},
                    upperQuartileValues = displayValueElements.upperQuartileValues = [],
                    lowerQuartileValues = displayValueElements.lowerQuartileValues = [],
                    medianValues = displayValueElements.medianValues = [],
                    clickFunction = function(data) {
                        var ele = this;
                        plotEventHandler.call(ele, chart, data);
                    },
                    shadowGroup = layers.shadows || (layers.shadows = paper.group('shadows', datasetLayer).toBack()),
                    style = options.plotOptions.series.dataLabels.style,
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

                            elem.upperBox.attr(elemHoverAttr.upperBox);
                            elem.lowerBox.attr(elemHoverAttr.lowerBox);

                            elem.upperBoxBorder.attr(elemHoverAttr.upperBoxBorder);
                            elem.lowerBoxBorder.attr(elemHoverAttr.lowerBoxBorder);

                            elem.upperQuartile.attr(elemHoverAttr.upperQuartile);
                            elem.lowerQuartile.attr(elemHoverAttr.lowerQuartile);

                            elem.medianBorder.attr(elemHoverAttr.median);

                            plotEventHandler.call(ele, chart, data, ROLLOVER);
                        };
                    },
                    rolloutResponseSetter = function (elem, elemUnHoverAttr) {
                        return function (data) {
                            var ele = this;

                            elem.upperBox.attr(elemUnHoverAttr.upperBox);
                            elem.lowerBox.attr(elemUnHoverAttr.lowerBox);

                            elem.upperBoxBorder.attr(elemUnHoverAttr.upperBoxBorder);
                            elem.lowerBoxBorder.attr(elemUnHoverAttr.lowerBoxBorder);

                            elem.upperQuartile.attr(elemUnHoverAttr.upperQuartile);
                            elem.lowerQuartile.attr(elemUnHoverAttr.lowerQuartile);

                            elem.medianBorder.attr(elemUnHoverAttr.median);

                            plotEventHandler.call(ele, chart, data, ROLLOUT);
                        };
                    },
                    plotItem,
                    set,
                    x,
                    y,
                    r,
                    setLink,
                    tooltext,
                    xPos,
                    yPos,
                    yBottom,
                    yBottomPos,
                    yTop,
                    yTopPos,
                    yMed,
                    yMedPos,
                    upperBoxH,
                    lowerBoxH,
                    upperQuartile,
                    lowerQuartile,
                    upperBoxBorder,
                    lowerBoxBorder,
                    median,
                    i,
                    num,
                    upperBoxElem,
                    lowerBoxElem,
                    midLineElem,
                    upperBoxBorderEle,
                    lowerBoxBorderEle,
                    upperQuartileEle,
                    lowerQuartileEle,
                    crispX,
                    crispX2,
                    crispY,
                    upperQValEle,
                    lowerQValEle,
                    medValEle,
                    textAlign,
                    groupId,
                    eventArgs,
                    hoverOutEffects;

                for (i = 0, num = data.length; i < num; i += 1) {
                    set = data[i];
                    y = set.y;
                    setLink = set.link;
                    tooltext = set.tooltext || set.toolText;

                    if (!(plotItem = plotItems[i])) {
                        plotItem = plotItems[i] = {
                            index: i,
                            value: y,
                            upperBox: null,
                            lowerBox: null,
                            upperBoxBorder: null,
                            lowerBoxBorder: null,
                            upperQuartileBorder: null,
                            lowerQuartileBorder: null,
                            medianBorder: null,
                            upperQuartileValues: null,
                            lowerQuartileValues: null,
                            medianValues: null,
                            tracker: null,
                            hot: null
                        };
                    }

                    if (y !== null) {
                        yPos = yAxis.getAxisPosition(y);
                        x = pluckNumber(set.x, i);
                        xPos = xAxis.getAxisPosition(x);
                        xPosOffset && (xPos += xPosOffset);
                        r = seriesOptions.borderRadius || 0;

                        upperQuartile = set.upperQuartile || {};
                        yTop = upperQuartile && upperQuartile.value;
                        yTopPos = yTop && yAxis.getAxisPosition(yTop);

                        lowerQuartile = set.lowerQuartile || {};
                        yBottom = lowerQuartile && lowerQuartile.value;
                        yBottomPos = yBottom && yAxis.getAxisPosition(yBottom);

                        median = set.median;
                        yMed = median && median.value; // || yBottom;
                        yMedPos = yMed && yAxis.getAxisPosition(yMed);

                        upperBoxH = yMedPos - yTopPos;
                        lowerBoxH = yBottomPos - yMedPos;

                        upperBoxBorder = set.upperBoxBorder || {};
                        lowerBoxBorder = set.lowerBoxBorder || {};

                        eventArgs = {
                            index: i,
                            link: setLink,
                            maximum: set.displayValueMax,
                            minimum: set.displayValueMin,
                            median: yMed,
                            q3: upperQuartile.value,
                            q1: lowerQuartile.value,
                            maxDisplayValue: set.displayValueMax,
                            minDisplayValue: set.displayValueMin,
                            medianDisplayValue: set.displayValueMid,
                            q1DisplayValue: set.displayValueQ1,
                            q3DisplayValue: set.displayValueQ3,
                            categoryLabel: set.categoryLabel,
                            toolText: set.toolText,
                            id: plot.userID,
                            datasetIndex: plot.index,
                            datasetName: plot.name,
                            visible: plot.visible
                        };

                        // upperBox
                        crispX = mathRound(xPos) + upperBoxBorder.borderWidth % 2 *
                            0.5;
                        crispX2 = mathRound(xPos + columnWidth) +
                            upperBoxBorder.borderWidth % 2 * 0.5;
                        crispY = mathRound(yTopPos) + upperQuartile.borderWidth %
                            2 * 0.5;
                        columnWidth = crispX2 - crispX;

                        // Create default cosmetics attributes for all elements to be used while hover out
                        hoverOutEffects = set.hoverEffects.rollOut = {
                            upperBox: {
                                fill: toRaphaelColor(set.color.FCcolor), //upperQuartile.color
                                'stroke-width': 0,
                                'stroke-dasharray': upperBoxBorder.dashStyle,
                                cursor: setLink ? 'pointer' : '',
                                ishot: true,
                                visibility: seriesVisibility
                            },
                            lowerBox: {
                                fill: toRaphaelColor(set.lowerboxColor.FCcolor),
                                'stroke-width': 0,
                                'stroke-dasharray': lowerBoxBorder.dashStyle,
                                cursor: setLink ? 'pointer' : BLANK,
                                ishot: true,
                                visibility: seriesVisibility
                            },
                            upperBoxBorder: {
                                stroke: upperBoxBorder.color,
                                'stroke-width': upperBoxBorder.borderWidth,
                                'stroke-linecap': ROUND,
                                dashstyle: upperBoxBorder.dashStyle,
                                ishot: true,
                                visibility: seriesVisibility
                            },
                            lowerBoxBorder: {
                                stroke: lowerBoxBorder.color,
                                'stroke-width': lowerBoxBorder.borderWidth,
                                dashstyle: lowerBoxBorder.dashStyle,
                                'stroke-linecap': ROUND,
                                ishot: true,
                                visibility: seriesVisibility
                            },
                            upperQuartile: {
                                stroke: toRaphaelColor(upperQuartile.color),
                                'stroke-width': upperQuartile.borderWidth,
                                'stroke-dasharray': upperQuartile.dashSyle,
                                'stroke-linecap': ROUND,
                                cursor: setLink ? 'pointer' : BLANK,
                                ishot: true,
                                visibility: seriesVisibility
                            },
                            lowerQuartile: {
                                stroke: toRaphaelColor(lowerQuartile.color),
                                'stroke-width': lowerQuartile.borderWidth,
                                'stroke-dasharray': lowerQuartile.dashSyle,
                                cursor: setLink ? 'pointer' : '',
                                'stroke-linecap': ROUND,
                                ishot: true,
                                visibility: seriesVisibility
                            },
                            median: {
                                stroke: toRaphaelColor(median.color),
                                'stroke-width': median.borderWidth,
                                'stroke-dasharray': median.dashSyle,
                                cursor: setLink ? 'pointer' : '',
                                'stroke-linecap': ROUND,
                                ishot: true,
                                visibility: seriesVisibility
                            }
                        };

                        upperBoxElem = plotItem.graphic = plotItem.upperBox =
                            paper.rect(crispX, crispY, columnWidth, upperBoxH, r,
                                upperBoxGroup)
                            .attr(hoverOutEffects.upperBox)
                            .shadow(seriesOptions.shadow && set.shadow, shadowGroup);

                        // upperBoxBorder
                        upperBoxBorderEle = plotItem.upperBoxBorder =
                            paper.path([M, crispX, crispY, V, crispY +
                                    upperBoxH, M, crispX2, crispY, V, crispY + upperBoxH
                                ],
                                upperBoxGroup)
                            .attr(hoverOutEffects.upperBoxBorder)
                            .shadow(seriesOptions.shadow && upperBoxBorder.shadow, shadowGroup);

                        // upperQuartile Border
                        upperQuartileEle = plotItem.upperQuartile =
                            paper.path([M, crispX, crispY, H, (crispX + columnWidth)],
                                medianGroup)
                            .attr(hoverOutEffects.upperQuartile)
                            .shadow(seriesOptions.shadow && upperQuartile.shadow, shadowGroup);

                        // lowerBox
                        crispX = mathRound(xPos) + lowerBoxBorder.borderWidth % 2 *
                            0.5;
                        crispX2 = mathRound(xPos + columnWidth) +
                            lowerBoxBorder.borderWidth % 2 * 0.5;
                        crispY = mathRound(yMedPos + lowerBoxH) +
                            lowerQuartile.borderWidth % 2 * 0.5;
                        lowerBoxElem = plotItem.lowerBox =
                            paper.rect(crispX, yMedPos, columnWidth, (crispY - yMedPos), r, lowerBoxGroup)
                            .attr(hoverOutEffects.lowerBox)
                            .shadow(seriesOptions.shadow && set.shadow, shadowGroup);

                        // lowerBoxBorder
                        lowerBoxBorderEle = plotItem.lowerBoxBorder =
                            paper.path([M, crispX, yMedPos, V, yMedPos +
                                    lowerBoxH, M, crispX2, yMedPos, V, yMedPos + lowerBoxH
                                ],
                                lowerBoxGroup)
                            .attr(hoverOutEffects.lowerBoxBorder)
                            .shadow(seriesOptions.shadow && lowerBoxBorder.shadow, shadowGroup);

                        // lowerQuartile Border
                        crispY = mathRound(yMedPos + lowerBoxH) +
                            lowerQuartile.borderWidth % 2 * 0.5;
                        lowerQuartileEle = plotItem.lowerQuartile =
                            paper.path([M, crispX, crispY, H, (crispX + columnWidth)],
                                medianGroup)
                            .attr(hoverOutEffects.lowerQuartile)
                            .shadow(seriesOptions.shadow && upperQuartile.shadow, shadowGroup);

                        // medianBorder
                        crispY = mathRound(yMedPos) + median.borderWidth % 2 * 0.5;
                        midLineElem = plotItem.medianBorder =
                            paper.path([M, crispX, crispY, H, (crispX +
                                columnWidth)], medianGroup)
                            .attr(hoverOutEffects.median);

                        groupId = plot.index + '_' + i;

                        upperBoxElem.click(clickFunction)
                            .hover(rolloverResponseSetter(plotItem, set.hoverEffects),
                                rolloutResponseSetter(plotItem, hoverOutEffects))
                            .data('groupId', groupId)
                            .data('eventArgs', eventArgs);

                        lowerBoxElem.click(clickFunction)
                            .hover(rolloverResponseSetter(plotItem, set.hoverEffects),
                                rolloutResponseSetter(plotItem, hoverOutEffects))
                            .data('groupId', groupId)
                            .data('eventArgs', eventArgs);

                        upperBoxBorderEle.click(clickFunction)
                            .hover(rolloverResponseSetter(plotItem, set.hoverEffects),
                                rolloutResponseSetter(plotItem, hoverOutEffects))
                            .data('groupId', groupId)
                            .data('eventArgs', eventArgs);

                        lowerBoxBorderEle.click(clickFunction)
                            .hover(rolloverResponseSetter(plotItem, set.hoverEffects),
                                rolloutResponseSetter(plotItem, hoverOutEffects))
                            .data('groupId', groupId)
                            .data('eventArgs', eventArgs);

                        upperQuartileEle.click(clickFunction)
                            .hover(rolloverResponseSetter(plotItem, set.hoverEffects),
                                rolloutResponseSetter(plotItem, hoverOutEffects))
                            .data('groupId', groupId)
                            .data('eventArgs', eventArgs);

                        lowerQuartileEle.click(clickFunction)
                            .hover(rolloverResponseSetter(plotItem, set.hoverEffects),
                                rolloutResponseSetter(plotItem, hoverOutEffects))
                            .data('groupId', groupId)
                            .data('eventArgs', eventArgs);

                        midLineElem.click(clickFunction)
                            .hover(rolloverResponseSetter(plotItem, set.hoverEffects),
                                rolloutResponseSetter(plotItem, hoverOutEffects))
                            .data('groupId', groupId)
                            .data('eventArgs', eventArgs);

                        // Drawing data values
                        textAlign = rotateValues ? POSITION_LEFT :
                            POSITION_CENTER;

                        if (defined(upperQuartile.displayValue) &&
                            upperQuartile.displayValue !== BLANK) {
                            upperQValEle = upperQuartileValues[i] =
                                paper.text(dataLabelsLayer)
                                .attr({
                                    text: upperQuartile.displayValue,
                                    x: xPos + columnWidth / 2,
                                    title: (upperQuartile.originalText || ''),
                                    y: yTopPos - valuePadding,
                                    'text-anchor': rotateValues ? 'start' : textAlign,
                                    'vertical-align': rotateValues ? 'middle' : 'bottom',
                                    'visibility': seriesVisibility,
                                    fill: style.color,
                                    'text-bound': [style.backgroundColor, style.borderColor,
                                        style.borderThickness, style.borderPadding,
                                        style.borderRadius, style.borderDash
                                    ]
                                })
                                .hover(rolloverResponseSetter(plotItem, set.hoverEffects),
                                    rolloutResponseSetter(plotItem, hoverOutEffects))
                                .data('groupId', groupId)
                                .css(css);
                            rotateValues && upperQValEle.rotate(rotateValues, (xPos + columnWidth / 2), (yTopPos -
                                valuePadding));
                        }

                        if (defined(median.displayValue) && median.displayValue !== BLANK) {
                            medValEle = medianValues[i] =
                                paper.text(dataLabelsLayer)
                                .attr({
                                    text: median.displayValue,
                                    x: xPos + columnWidth / 2,
                                    y: yMedPos - valuePadding,
                                    title: (median.originalText || ''),
                                    'text-anchor': rotateValues ? 'start' : textAlign,
                                    'vertical-align': rotateValues ? 'middle' : 'bottom',
                                    'visibility': seriesVisibility,
                                    fill: style.color,
                                    'text-bound': [style.backgroundColor, style.borderColor,
                                        style.borderThickness, style.borderPadding,
                                        style.borderRadius, style.borderDash
                                    ]
                                })
                                .hover(rolloverResponseSetter(plotItem, set.hoverEffects),
                                    rolloutResponseSetter(plotItem, hoverOutEffects))
                                .data('groupId', groupId)
                                .css(css);
                            rotateValues && medValEle.rotate(rotateValues, (xPos +
                                columnWidth / 2), (yMedPos - valuePadding));
                        }

                        if (defined(lowerQuartile.displayValue) &&
                            lowerQuartile.displayValue !== BLANK) {
                            lowerQValEle = lowerQuartileValues[i] =
                                paper.text(dataLabelsLayer)
                                .attr({
                                    text: lowerQuartile.displayValue,
                                    x: xPos + columnWidth / 2,
                                    y: yBottomPos + valuePadding,
                                    title: (lowerQuartile.originalText || ''),
                                    'text-anchor': rotateValues ? 'start' : textAlign,
                                    'vertical-align': rotateValues ? 'middle' : 'top',
                                    'visibility': seriesVisibility,
                                    fill: style.color,
                                    'text-bound': [style.backgroundColor, style.borderColor,
                                        style.borderThickness, style.borderPadding,
                                        style.borderRadius, style.borderDash
                                    ]
                                })
                                .hover(rolloverResponseSetter(plotItem, set.hoverEffects),
                                    rolloutResponseSetter(plotItem, hoverOutEffects))
                                .data('groupId', groupId)
                                .css(css);
                            rotateValues && lowerQValEle.rotate(rotateValues, (xPos + columnWidth / 2), (yBottomPos +
                                valuePadding));
                        }

                        if (isTooltip) {
                            upperBoxElem.tooltip(tooltext);
                            lowerBoxElem.tooltip(tooltext);
                            upperBoxBorderEle.tooltip(tooltext);
                            lowerBoxBorderEle.tooltip(tooltext);
                            upperQuartileEle.tooltip(tooltext);
                            lowerQuartileEle.tooltip(tooltext);
                            midLineElem.tooltip(tooltext);

                            upperQValEle && upperQValEle.tooltip(tooltext);
                            medValEle && medValEle.tooltip(tooltext);
                            lowerQValEle && lowerQValEle.tooltip(tooltext);
                        }


                        if (upperBoxElem) {
                            datasetGraphics.push(upperBoxElem);
                        }

                        if (lowerBoxElem) {
                            datasetGraphics.push(lowerBoxElem);
                        }

                        if (midLineElem) {
                            datasetGraphics.push(midLineElem);
                        }

                        if (upperBoxBorderEle) {
                            datasetGraphics.push(upperBoxBorderEle);
                        }

                        if (lowerBoxBorderEle) {
                            datasetGraphics.push(lowerBoxBorderEle);
                        }

                        if (upperQuartileEle) {
                            datasetGraphics.push(upperQuartileEle);
                        }

                        if (lowerQuartileEle) {
                            datasetGraphics.push(lowerQuartileEle);
                        }

                        if (upperQValEle) {
                            datasetGraphics.push(upperQValEle);
                        }

                        if (medValEle) {
                            datasetGraphics.push(medValEle);
                        }

                        if (lowerQValEle) {
                            datasetGraphics.push(lowerQValEle);
                        }
                    }
                }

                datasetLayer.attr({
                    'clip-rect': [chart.canvasLeft, chart.canvasTop, animationDuration ? 0 : chart.canvasWidth,
                        chart.canvasHeight
                    ]
                });

                if (animationDuration) {
                    datasetLayer.animate({
                        'clip-rect': [chart.canvasLeft, chart.canvasTop,
                            chart.canvasWidth, chart.canvasHeight
                        ]
                    }, animationDuration, 'normal');
                }

                plot.visible = (dataOptions.visible !== false);
            }

        }, renderer['renderer.cartesian']);

        renderer('renderer.dragnode', {
            drawPlotDragnode: function(plot, dataOptions) {
                var chart = this,
                    datasetGraphics = plot.graphics = [],
                    series = {},
                    options = chart.options,
                    conf = options._FCconf,
                    tooltip = options.tooltip,
                    inCanvasStyle = conf.inCanvasStyle,
                    paper = chart.paper,
                    layers = chart.layers,
                    plotItems = plot.items,
                    gDataset = layers.dataset, //requird for series drawing
                    gConnector = layers.connector, //requird for series drawing
                    xAxis = series.xAxis = chart.xAxis[dataOptions.xAxis || 0],
                    yAxis = series.yAxis = chart.yAxis[dataOptions.yAxis || 0],
                    data = dataOptions.data,
                    seriesElements = series.elements = {
                        data: []
                    },
                    smartLabel = chart.smartLabel,
                    seriesOptions = options.plotOptions.series,
                    style = seriesOptions.dataLabels.style,
                    connectorStyle = options.orphanStyles.connectorlabels.style,
                    connectors = options.connectors,
                    connectorsStore = options.connectorsStore,
                    pointStore = options.pointStore || (options.pointStore = []),
                    invalConnectStore = options.invalConnectStore,
                    PX = 'px',
                    css = {
                        fontFamily: style.fontFamily,
                        fontSize: style.fontSize,
                        lineHeight: style.lineHeight,
                        fontWeight: style.fontWeight,
                        fontStyle: style.fontStyle
                    },
                    drawConnectorFN = function(connector) {
                        // If booth the end point's belongs to this series then only
                        // draw this connector
                        if (pointStore[connector.from] && pointStore[connector.to]) {
                            connectorsStore.push(new ConnectorClass(connector,
                                pointStore, connectorStyle, paper, gConnector, chart));
                        } else {
                            invalConnectStore.push(connector);
                        }
                    },
                    elemMouseDownFN = function() { // Long press eve
                        var ele = this;
                        ele.data('fire_click_event', 1);
                        clearTimeout(ele._longpressactive);
                        ele._longpressactive = setTimeout(function() {
                            ele.data('fire_click_event', 0);
                            if (!ele.data('viewMode')) {
                                chart.logic
                                    .showLabelDeleteUI(chart, ele);
                            }
                        }, CLEAR_TIME_1000);
                    },
                    elemMouseMoveFN = function() {
                        // Whether to fire the click event ot not
                        var ele = this;
                        if (ele.data('fire_click_event')) {
                            ele.data('fire_click_event', 0);
                            clearLongPress.call(this);
                        }
                    },
                    elemMouseUPFN = function(data) {
                        var ele = this,
                            fireClick = ele.data('fire_click_event');
                        clearLongPress.call(ele);
                        if (fireClick) {
                            /**
                             *
                             * > Applicable to `dragnode` chart only.
                             *
                             * @event FusionCharts#labelClick
                             * @group chart-powercharts:dragnode
                             *
                             * @param {number} chartX - x-coordinate of the pointer relative to the chart.
                             * @param {number} chartY - y-coordinate of the pointer relative to the chart.
                             * @param {number} pageX - x-coordinate of the pointer relative to the page.
                             * @param {number} pageY - y-coordinate of the pointer relative to the page.
                             *
                             * @param {number} x - The x-value of the label node scaled as per the axis of the chart.
                             * @param {number} y - The y-value of the label node scaled as per the axis of the chart.
                             *
                             * @param {string} text - The text value of the label.
                             */
                            plotEventHandler.call(ele, chart, data, 'LabelClick');
                        }
                    },
                    elemHoverFN = function(data) {
                        var ele = this;
                        /**
                         *
                         * > Applicable to `dragnode` chart only.
                         *
                         * @event FusionCharts#labelRollOver
                         * @group chart-powercharts:dragnode
                         *
                         * @param {number} chartX - x-coordinate of the pointer relative to the chart.
                         * @param {number} chartY - y-coordinate of the pointer relative to the chart.
                         * @param {number} pageX - x-coordinate of the pointer relative to the page.
                         * @param {number} pageY - y-coordinate of the pointer relative to the page.
                         *
                         * @param {number} x - The x-value of the label node scaled as per the axis of the chart.
                         * @param {number} y - The y-value of the label node scaled as per the axis of the chart.
                         *
                         * @param {string} text - The text value of the label.
                         */
                        plotEventHandler.call(ele, chart, data, 'LabelRollover');
                    },
                    elemOutFN = function(data) {
                        var ele = this;
                        /**
                         *
                         * > Applicable to `dragnode` chart only.
                         *
                         * @event FusionCharts#labelRollOut
                         * @group chart-powercharts:dragnode
                         *
                         * @param {number} chartX - x-coordinate of the pointer relative to the chart.
                         * @param {number} chartY - y-coordinate of the pointer relative to the chart.
                         * @param {number} pageX - x-coordinate of the pointer relative to the page.
                         * @param {number} pageY - y-coordinate of the pointer relative to the page.
                         *
                         * @param {number} x - The x-value of the label node scaled as per the axis of the chart.
                         * @param {number} y - The y-value of the label node scaled as per the axis of the chart.
                         *
                         * @param {string} text - The text value of the label.
                         */
                        plotEventHandler.call(ele, chart, data, 'LabelRollout');
                    },
                    dragFN = function(dx, dy, x, y, event) { // Move
                        var ele = this,
                            data = ele.data('data'),
                            //chart = data.chart,
                            bBox = data.bBox,
                            boundaryBottom = chart.canvasTop + chart.canvasHeight,
                            boundaryRight = chart.canvasLeft + chart.canvasWidth;
                        /*
                         mathMin((cx + dx), (data.boundaryRight - hw))
                         mathMax((cx + dx), (data.boundaryLeft + hw), dx);
                         */
                        if (!ele.data('fire_dragend')) {
                            /**
                             *
                             * > Applicable to `dragnode` chart only.
                             *
                             * @event FusionCharts#labelDragStart
                             * @group chart-powercharts:dragnode
                             *
                             * @param {number} chartX - x-coordinate of the pointer relative to the chart.
                             * @param {number} chartY - y-coordinate of the pointer relative to the chart.
                             * @param {number} pageX - x-coordinate of the pointer relative to the page.
                             * @param {number} pageY - y-coordinate of the pointer relative to the page.
                             *
                             * @param {number} x - The x-value of the label node scaled as per the axis of the chart.
                             * @param {number} y - The y-value of the label node scaled as per the axis of the chart.
                             *
                             * @param {string} text - The text value of the label.
                             */
                            plotEventHandler.call(ele, chart, event, 'LabelDragStart');
                            ele.data('fire_dragend', 1);
                        }


                        //bound limits
                        if (bBox.x + dx < chart.canvasLeft) {
                            dx = chart.canvasLeft - bBox.x;
                        }
                        if (bBox.x2 + dx > boundaryRight) {
                            dx = boundaryRight - bBox.x2;
                        }
                        if (bBox.y + dy < chart.canvasTop) {
                            dy = chart.canvasTop - bBox.y;
                        }
                        if (bBox.y2 + dy > boundaryBottom) {
                            dy = boundaryBottom - bBox.y2;
                        }

                        ele.attr({
                            x: bBox.x + dx,
                            y: bBox.y + dy
                        });
                        data.label.attr({
                            x: data.ox + dx,
                            y: data.oy + dy
                        });
                    },
                    dragStartFN = function() { // start
                        var ele = this,
                            data = ele.data('data'),
                            bBox = ele.getBBox();
                        data.ox = data.label.attr('x');
                        data.oy = data.label.attr('y');
                        data.bBox = bBox;

                        ele.data('fire_dragend', 0);

                    },
                    dragStopFN = function(event) { //up
                        var ele = this,
                            data = ele.data('data'),
                            label = data.label,
                            sourceEvent = 'labeldragend',
                            reflow = {
                                hcJSON: {
                                    dragableLabels: []
                                }
                            },
                        eventArgs = ele.data('eventArgs'),
                            x = eventArgs.x = chart.xAxis[0]
                            .getAxisPosition(label.attr('x'), 1),
                            y = eventArgs.y = chart.yAxis[0]
                            .getAxisPosition(label.attr('y'), 1),
                            eventCord;

                        // Store currend updated x, y for resize
                        // Save state
                        reflow.hcJSON.dragableLabels[data.labelNode.index] = {
                            y: y,
                            x: x
                        };
                        extend2(chart.logic.chartInstance.jsVars._reflowData,
                            reflow, true);

                        if (ele.data('fire_dragend')) {

                            eventCord = getMouseCoordinate(chart.container, event);
                            eventCord.sourceEvent = sourceEvent;

                            // Fire the ChartUpdated event
                            lib.raiseEvent('chartupdated',
                                extend2(eventCord, eventArgs),
                                chart.logic.chartInstance);
                            /**
                             *
                             * > Applicable to `dragnode` chart only.
                             *
                             * @event FusionCharts#labelDragEnd
                             * @group chart-powercharts:dragnode
                             *
                             * @param {number} chartX - x-coordinate of the pointer relative to the chart.
                             * @param {number} chartY - y-coordinate of the pointer relative to the chart.
                             * @param {number} pageX - x-coordinate of the pointer relative to the page.
                             * @param {number} pageY - y-coordinate of the pointer relative to the page.
                             *
                             * @param {number} x - The x-value of the label node scaled as per the axis of the chart.
                             * @param {number} y - The y-value of the label node scaled as per the axis of the chart.
                             *
                             * @param {string} text - The text value of the label.
                             */
                            plotEventHandler.call(ele, chart, event, sourceEvent);
                        }

                    },
                    i,
                    ln,
                    set,
                    xPos,
                    yPos,
                    marker,
                    symbol,
                    plotElements,
                    setElement,
                    imageElement,
                    labelElement,
                    trackerElement,
                    dragableLabels,
                    group,

                    config,
                    confShapeArg,
                    pointOptions,
                    graphic,
                    height,
                    width,
                    radius,
                    isRectangle,
                    id,
                    imageNode,
                    imageURL,
                    imageAlign,
                    labelAlign,
                    plotWidth,
                    imageWidth,
                    plotHeight,
                    imageHeight,
                    pointAttr,

                    valueString,
                    smartTextObj,
                    labelDisplacement,
                    yAdjustment,
                    labelY,
                    connector,
                    dragLabelGroup,
                    incanFontSize,
                    incanBackgroundColor,
                    incanBorderColor,
                    label,
                    text,
                    labelX,
                    labelFontSize,
                    labelColor,
                    alpha,
                    allowdrag,
                    padding,
                    labelBGColor,
                    labelBDColor,
                    labelNode,
                    bBox,
                    labelStyle,
                    tracker,
                    imageY,
                    eventArgs,
                    rolloverProperties;

                //create series group
                if (!gConnector) {
                    gConnector = layers.connector = paper.group('connectors')
                        .insertBefore(gDataset);
                }
                // set tooltip configurations
                if (tooltip && (tooltip.enabled !== false)) {
                    gConnector.trackTooltip(true);
                }

                group = seriesElements.group = paper.group(gDataset);
                dragLabelGroup = seriesElements.dragLabelGroup = paper.group(gDataset);

                smartLabel.setStyle(style);

                //draw data
                for (i = 0, ln = data.length; i < ln; i += 1) {
                    set = data[i];
                    marker = set.marker;
                    set._yPos = yPos = yAxis.getAxisPosition(set.y);
                    set._xPos = xPos = xAxis.getAxisPosition(set.x);
                    plotElements = plotItems[i] || (plotItems[i] = {});
                    rolloverProperties = set.hoverEffects && set.hoverEffects.rolloverProperties;
                    setElement = plotElements.graphic;
                    imageElement = plotElements.image;
                    labelElement = plotElements.label;
                    marker = set.marker;

                    // only draw the point if y is defined
                    if (yPos !== UNDEFINED && !isNaN(yPos) && marker) {
                        config = set._config = set._config || {
                            shapeArg: {},
                            startConnectors: [],
                            endConnectors: []
                        };
                        confShapeArg = config.shapeArg;
                        pointOptions = set._options;
                        graphic = set.graphic;
                        height = pluckNumber(marker && marker.height);
                        width = pluckNumber(marker && marker.width);
                        radius = pluckNumber(marker && marker.radius);
                        symbol = pluck(marker && marker.symbol);
                        isRectangle = symbol === 'rectangle';
                        id = set.id;
                        imageNode = set.imageNode;
                        imageURL = set.imageURL;
                        imageAlign = set.imageAlign; //TOP, MIDDLE or BOTTOM
                        labelAlign = set.labelAlign;
                        plotWidth = isRectangle ? width : radius * 1.4;
                        imageWidth = pluckNumber(set.imageWidth, plotWidth);
                        plotHeight = isRectangle ? height : radius * 1.4;
                        imageHeight = pluckNumber(set.imageHeight, plotHeight);

                        pointAttr = {
                            fill: toRaphaelColor(marker.fillColor),
                            'stroke-width': marker.lineWidth,
                            r: marker.radius,
                            stroke: toRaphaelColor(marker.lineColor)
                        };

                        symbol = confShapeArg.symbol = pluck(marker && marker.symbol,
                            series.symbol);
                        symbol = symbol.split('_');

                        confShapeArg.x = xPos;
                        confShapeArg.y = yPos;
                        confShapeArg.radius = marker.radius;
                        confShapeArg.width = width;
                        confShapeArg.height = height;
                        confShapeArg.sides = symbol[1];

                        if (symbol[0] === 'poly' || symbol[0] === 'circle') {
                            setElement = paper.polypath(symbol[1], xPos,
                                yPos, marker.radius, marker.startAngle, 0, group)
                                .attr(pointAttr);
                        } else {
                            config.shapeType = SHAPE_RECT;
                            confShapeArg.x = xPos - (width / 2);
                            confShapeArg.y = yPos - (height / 2);
                            confShapeArg.r = 0;
                            pointAttr.width = width;
                            pointAttr.height = height;
                            pointAttr.x = xPos - (width / 2);
                            pointAttr.y = yPos - (height / 2);
                            // Readjust x and y of the rectangle if hover width or height is
                            // changed
                            if (rolloverProperties && set.hoverEffects.enabled) {
                                rolloverProperties.x = xPos - (rolloverProperties.width / 2);
                                rolloverProperties.y = yPos - (rolloverProperties.height / 2);
                                delete rolloverProperties.r;
                            }
                            delete pointAttr.r;
                            setElement = paper.rect(confShapeArg.x,
                                confShapeArg.y, width, height, 0, group)
                                .attr(pointAttr);
                        }

                        // Draw the imageNode if available
                        if (imageNode && imageURL) {
                            if (imageHeight > plotHeight) {
                                imageHeight = plotHeight;
                            }
                            if (imageWidth > plotWidth) {
                                imageWidth = plotWidth;
                            }
                            switch (imageAlign) {
                            case 'middle':
                                imageY = yPos - (imageHeight / 2);
                                break;
                            case 'bottom':
                                imageY = plotHeight > imageHeight ? yPos +
                                    (plotHeight / 2) - imageHeight :
                                    yPos - imageHeight / 2;
                                break;
                            default:
                                imageY = plotHeight > imageHeight ?
                                    yPos - (plotHeight * 0.5) :
                                    yPos - imageHeight / 2;
                                break;
                            }
                            config.imageX = xPos - (imageWidth / 2);
                            config.imageY = imageY;

                            if (!imageElement) {
                                imageElement = paper.image(group);
                            }

                            imageElement.attr({
                                src: imageURL,
                                x: config.imageX,
                                y: imageY,
                                width: imageWidth,
                                height: imageHeight
                            });
                        }

                        // Drawing of the displayValue
                        valueString = set.displayValue;
                        if (defined(valueString) || valueString !== BLANK) {
                            // Get the displayValue text according to the canvas width.
                            smartTextObj = smartLabel.getSmartText(valueString,
                                plotWidth, plotHeight);

                            // label displacement for top or bottom
                            labelDisplacement = plotHeight * 0.5 -
                                (smartTextObj.height * 0.5);
                            // label at TOP
                            switch (labelAlign) {
                            case 'top':
                                labelDisplacement = -labelDisplacement;
                                break;
                            case 'bottom':
                                labelDisplacement = labelDisplacement;
                                break;
                            default:
                                labelDisplacement = 0;
                                break;
                            }
                            set._yAdjustment = yAdjustment = labelDisplacement;
                            labelY = yPos + yAdjustment;

                            if (labelElement) {
                                labelElement.attr({
                                    text: smartTextObj.text,
                                    title: (smartTextObj.tooltext || ''),
                                    fill: style.color,
                                    x: xPos,
                                    y: labelY
                                });
                            } else {
                                labelElement = paper.text(group);
                                labelElement.attr({
                                    text: smartTextObj.text,
                                    fill: style.color,
                                    x: xPos,
                                    y: labelY,
                                    'text-bound': [style.backgroundColor, style.borderColor,
                                        style.borderThickness, style.borderPadding,
                                        style.borderRadius, style.borderDash
                                    ]
                                })
                                    .css(css);
                            }
                        }

                        pointStore[id] = set;

                        plotElements.index = i;
                        plotElements.graphic = setElement;
                        plotElements.label = labelElement;
                        plotElements.image = imageElement; //plot, dataOptions
                        trackerElement = chart.drawTracker &&
                            chart.drawTracker.call(chart, plot, dataOptions, i, pointAttr);
                        setElement && datasetGraphics.push(setElement);
                        labelElement && datasetGraphics.push(labelElement);
                        imageElement && datasetGraphics.push(imageElement);
                        trackerElement && datasetGraphics.push(trackerElement);
                    }
                    plotElements.index = i;
                    plotElements.tracker = trackerElement;
                }

                // Drawing the connectors and connectors Labels
                if (!connectorsStore) { //first time
                    connectorsStore = options.connectorsStore = [];
                    invalConnectStore = options.invalConnectStore = [];
                    for (i = 0; i < connectors.length; i += 1) {
                        each(connectors[i].connector, drawConnectorFN);
                    }
                } else { //from 2nd series
                    for (i = invalConnectStore.length - 1; i >= 0; i -= 1) {
                        connector = invalConnectStore[i];
                        //if booth the end point's found then only draw this connector
                        if (pointStore[connector.from] && pointStore[connector.to]) {
                            //also remove from invalConnectStore as it is drawn
                            invalConnectStore.splice(i, 1);
                            connectorsStore.push(new ConnectorClass(connector,
                                pointStore, connectorStyle, paper, gConnector, chart));
                        }
                    }
                }
                // End drawing connectors

                //draw dragable labels for the first time
                if (!chart.dragLabelsDrawn &&
                    (dragableLabels = options.dragableLabels) &&
                    (ln = dragableLabels.length) > 0) {
                    //create the label group
                    plotWidth = chart.plotSizeX;
                    plotHeight = chart.plotSizeY;
                    incanFontSize = parseInt(inCanvasStyle.fontSize, 10);
                    incanBackgroundColor = inCanvasStyle.backgroundColor;
                    incanBorderColor = inCanvasStyle.borderColor;
                    for (i = 0; i < ln; i += 1) {
                        label = dragableLabels[i];
                        label.index = i;
                        text = parseUnsafeString(pluck(label.text, label.label));

                        if (text) {
                            text = parseUnsafeString(text);

                            labelX = xAxis.getAxisPosition(label.x || 0);
                            labelY = yAxis.getAxisPosition(label.y || 0, 0, 1, 0, 1);
                            labelFontSize = pluckNumber(label.fontsize, incanFontSize);
                            labelColor = pluckColor(pluck(label.color,
                                inCanvasStyle.color));
                            alpha = (pluckNumber(label.alpha, 100)) / 100;
                            allowdrag = pluckNumber(label.allowdrag, 1);
                            yAdjustment = labelFontSize * 0.8;
                            padding = pluckNumber(label.padding, 5);
                            labelStyle = {
                                fontSize: labelFontSize + PX,
                                fontFamily: inCanvasStyle.fontFamily,
                                fill: labelColor,
                                color: labelColor,
                                opacity: alpha
                            };
                            //set the line height
                            setLineHeight(labelStyle);
                            labelBGColor = pluck(label.bgcolor, incanBackgroundColor);
                            labelBDColor = pluck(label.bordercolor, incanBorderColor);

                            eventArgs = {
                                link: label.link,
                                text: text,
                                x: labelX,
                                y: labelY,
                                allowdrag: allowdrag,
                                sourceType: 'labelnode'
                            };

                            if (labelBGColor) {
                                labelStyle.backgroundColor = labelBGColor
                                    .replace(dropHash, HASHSTRING);
                                labelStyle.backgroundOpacity = alpha;
                            }
                            if (labelBDColor) {
                                labelStyle.borderColor = labelBDColor.replace(dropHash,
                                    HASHSTRING);
                                labelStyle.borderOpacity = alpha;
                            }
                            //if there has positive padding
                            labelNode = paper.text(dragLabelGroup)
                                .css(labelStyle)
                                .attr({
                                    text: text,
                                    x: labelX,
                                    y: labelY,
                                    align: POSITION_CENTER,
                                    'text-bound': [(label.bgcolor || '')
                                        .replace(dropHash, HASHSTRING), (label.bordercolor || '')
                                        .replace(dropHash, HASHSTRING),
                                        pluckNumber(label.borderthickness, 1),
                                        padding,
                                        pluckNumber(label.radius, 0),
                                        pluckNumber(label.dashed, 0) ?
                                        getDashStyle(pluckNumber(label.dashlen, 5),
                                            pluckNumber(label.dashgap, 4),
                                            pluckNumber(label.borderthickness, 1)) :
                                        undefined
                                    ]
                                });

                            //dragLabelGroup.appendChild(labelNode);
                            bBox = labelNode.getBBox();

                            //create the tracker
                            tracker = paper.rect(bBox.x - padding, bBox.y - padding,
                                bBox.width + (padding * 2), bBox.height +
                                (padding * 2), 0)
                                .attr({
                                    fill: TRACKER_FILL,
                                    ishot: true,
                                    'stroke-width': 0
                                })
                                .css({
                                    cursor: allowdrag ? 'move' : ''
                                })
                                .mousedown(elemMouseDownFN)
                                .mousemove(elemMouseMoveFN)
                                .mouseup(elemMouseUPFN)
                                .data('viewMode', options.chart.viewMode)
                                .hover(elemHoverFN, elemOutFN);


                            dragLabelGroup.appendChild(tracker);
                            tracker.data('data', {
                                label: labelNode,
                                labelNode: label,
                                chart: chart
                            })
                                .data('eventArgs', eventArgs)
                                .data('link', label.link);

                            if (allowdrag) {
                                tracker.drag(dragFN, dragStartFN, dragStopFN);
                            }
                        }
                    }
                    //donot draw the labels any more
                    chart.dragLabelsDrawn = true;
                }

                return series;
            },

            drawTracker: function(plot, dataOptions, index, pointAttr) {
                var chart = this,
                    paper = chart.paper,
                    dataObj = plot.data[index],
                    plotItems = plot.items[index],
                    config = dataObj._config,
                    gTracker = chart.layers.tracker, //requird for series drawing
                    attr = extend({}, config.pointAttr),
                    shapeArg = config.shapeArg,
                    xPos = shapeArg.x,
                    yPos = shapeArg.y,
                    width = shapeArg.width,
                    height = shapeArg.height,
                    radius = shapeArg.radius,
                    dragStart = chart.dragStart,
                    dragUp = chart.dragUp,
                    dragMove = chart.dragMove,
                    elements = chart.elements,
                    waitElement = elements.waitElement,
                    cursor = dataObj.link ? 'pointer' : dataObj.allowDrag ? 'move' : '',
                    trackerEle = plotItems.tracker,
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
                    eventArgs;

                // Drawing of tracker
                attr.fill = TRACKER_FILL;
                attr.stroke = TRACKER_FILL;
                attr.cursor = cursor;
                attr.ishot = true;

                if (config.shapeType === 'rect') {
                    trackerEle = paper.rect(xPos, yPos, width, height, 0)
                        .attr(attr);
                } else {
                    trackerEle = paper.polypath(shapeArg.sides, xPos,
                        yPos, radius, shapeArg.startAngle)
                        .attr(attr);
                }

                eventArgs = {
                    index: index,
                    link: dataObj.link,
                    y: dataObj.y,
                    x: dataObj.x,
                    shape: pluck(dataObj._options.shape, 'rect'),
                    width: width,
                    height: height,
                    radius: radius,
                    sides: shapeArg.sides,
                    label: dataObj.displayValue,
                    toolText: dataObj.toolText,
                    id: dataObj.id,
                    datasetIndex: plot.index,
                    datasetName: plot.name,
                    sourceType: 'dataplot'
                };

                plotItems.tracker = trackerEle
                    .mousedown(function(e) { // Long press eve
                        var ele = this,
                            touchEvent = (hasTouch && getTouchEvent(e)) || stubEvent,
                            layerX = e.layerX || touchEvent.layerX,
                            layerY = e.layerY || touchEvent.layerY,
                            chartPosition = lib.getPosition(chart.container);

                        // Whether to fire the click event ot not
                        ele.data('fire_click_event', 1);
                        // to monitor mousedown is on and dragging is in progress
                        ele.data('mousedown', 1);
                        if (layerX === undefined) {
                            layerX = (e.pageX || touchEvent.pageX) - chartPosition.left;
                            layerY = (e.pageY || touchEvent.pageY) - chartPosition.top;
                        }

                        clearTimeout(ele._longpressactive);
                        // DragNode mouse progress cursor added.
                        ele.data('move', true);
                        //ele.css({cursor: 'wait'});
                        // If vide mode is enabled, don't open the node edit UI.
                        if (!chart.options.chart.viewMode) {
                            if (!(waitElement = elements.waitElement)) {
                                waitElement = elements.waitElement = paper.ringpath(gTracker)
                                    .attr({
                                        fill: toRaphaelColor({
                                            alpha: '100,100',
                                            angle: 120,
                                            color: 'CCCCCC,FFFFFF',
                                            ratio: '30,50'
                                        }),
                                        'stroke-width': 0
                                    });
                            }
                            layerX += 11;
                            layerY -= 21;
                            waitElement.attr({
                                ringpath: [layerX, layerY, 8, 11, 0, 0]
                            })
                            .show()
                            .animate({
                                ringpath: [layerX, layerY, 8, 11, 0, 6.28]
                            }, CLEAR_TIME_1000);

                            ele._longpressactive = setTimeout(function() {
                                var seriesName = (dataOptions.name !== BLANK &&
                                    dataOptions.name !== UNDEFINED) ?
                                    dataOptions.name + COMMASTRING +
                                    BLANKSPACE : BLANK,
                                    seriesId = dataOptions.id,
                                    symbolMap = {
                                        circle: 'circ',
                                        polygon: 'poly',
                                        'undefined': 'rect'
                                    },
                                    userOpt = dataObj._options,
                                    shape = symbolMap[userOpt.shape];
                                elements.waitElement && elements.waitElement.hide();
                                // Whether to fire the click event ot not
                                ele.data('fire_click_event', 0);
                                chart.logic.showNodeUpdateUI(chart, {
                                    x: {
                                        value: dataObj.x
                                    },
                                    y: {
                                        value: dataObj.y
                                    },
                                    draggable: {
                                        value: getFirstValue(userOpt.allowdrag, 1)
                                    },
                                    color: {
                                        value: userOpt.color
                                    },
                                    alpha: {
                                        value: userOpt.alpha
                                    },
                                    label: {
                                        value: getFirstValue(userOpt.label,
                                            userOpt.name)
                                    },
                                    tooltip: {
                                        value: userOpt.tooltext
                                    },
                                    shape: {
                                        value: shape
                                    },
                                    rectWidth: {
                                        value: userOpt.width
                                    },
                                    rectHeight: {
                                        value: userOpt.height
                                    },
                                    circPolyRadius: {
                                        value: userOpt.radius
                                    },
                                    polySides: {
                                        value: userOpt.numsides
                                    },
                                    image: {
                                        value: userOpt.imagenode
                                    },
                                    imgWidth: {
                                        value: userOpt.imagewidth
                                    },
                                    imgHeight: {
                                        value: userOpt.imageheight
                                    },
                                    imgAlign: {
                                        value: userOpt.imagealign
                                    },
                                    imgUrl: {
                                        value: userOpt.imageurl
                                    },
                                    id: {
                                        value: dataObj.id,
                                        disabled: true
                                    },
                                    link: {
                                        value: userOpt.link
                                    },
                                    dataset: {
                                        innerHTML: '<option value="' +
                                            seriesId + '">' + seriesName +
                                            seriesId + '</option>',
                                        disabled: true
                                    }
                                }, true);
                            }, CLEAR_TIME_1000);
                        }
                    })
                    .mousemove(function() {
                        elements.waitElement && elements.waitElement.hide();
                        // Whether to fire the click event ot not
                        this.data('fire_click_event', 0);
                        clearLongPress.call(this);
                    })
                    .mouseup(function(data) {
                        var ele = this,
                            fireClick = this.data('fire_click_event');

                        elements.waitElement && elements.waitElement.hide();
                        clearLongPress.call(this);
                        ele.data('mousedown', 0);

                        fireClick && plotEventHandler.call(ele, chart, data);
                    })
                    .hover(rolloverResponseSetter(plotItems, dataObj.hoverEffects.rolloverProperties),
                        rolloutResponseSetter(plotItems, pointAttr))
                    .data('eventArgs', eventArgs)
                    .data('drag-options', {
                        plotItems: plotItems,
                        dataObj: dataObj,
                        endConnectors: config.endConnectors,
                        startConnectors: config.startConnectors,
                        boundaryTop: chart.canvasTop,
                        boundaryBottom: chart.canvasTop + chart.canvasHeight,
                        boundaryLeft: chart.canvasLeft,
                        boundaryRight: chart.canvasLeft + chart.canvasWidth,
                        cloneGroup: chart.layers.dataset,
                        datasetIndex: plot.index,
                        pointIndex: index,
                        dataOptions: dataOptions,
                        cursor: cursor,
                        chart: chart,
                        link: dataObj.link
                    })
                    .tooltip(dataObj.toolText);

                gTracker.appendChild(trackerEle);

                dataObj.allowDrag && trackerEle.drag(function(dx, dy, px, py, event) {
                        var ele = this;
                        dragMove.call(ele, dx, dy, px, py, event, chart);
                    },
                    function(dx, dy, px, py, event) {
                        var ele = this;
                        dragStart.call(ele, dx, dy, px, py, event, chart);
                    },
                    function(event) {
                        var ele = this;
                        dragUp.call(ele, event, chart);
                    });

                return trackerEle;
            },

            dragStart: function() {
                var ele = this,
                    paper = ele.paper,
                    data = ele.data('drag-options') || {},
                    dataObj = data.dataObj,
                    plotItems = data.plotItems,
                    cloneGroup = plotItems.cloneGroup,
                    cloneGraphic = plotItems.cloneGraphic,
                    cloneImage = plotItems.cloneImage,
                    cloneLabel = plotItems.cloneLabel,
                    bBox = ele.getBBox(),
                    attr = {
                        opacity: 0.3
                    };

                data.bBoxX = bBox.x;
                data.bBoxX2 = bBox.x2 || (bBox.x + bBox.width);
                data.bBoxY = bBox.y;
                data.bBoxY2 = bBox.y2 || (bBox.y + bBox.height);

                // store original x, y positions
                data.origX = data.lastX || (data.lastX = 0);
                data.origY = data.lastY || (data.lastY = 0);

                data.draged = false;
                data.startYValue = dataObj.y;
                data.startXValue = dataObj.x;

                if (!cloneGroup) {
                    cloneGroup = plotItems.cloneGroup = paper.group(data.cloneGroup)
                        .attr(attr);
                }

                // Create clone elements
                if (plotItems.graphic && !cloneGraphic) {
                    cloneGraphic = plotItems.cloneGraphic =
                        plotItems.graphic.clone();
                    cloneGroup.appendChild(cloneGraphic);
                    cloneGraphic.attr(attr);

                }

                if (plotItems.image && !cloneImage) {
                    cloneImage = plotItems.cloneImage =
                        plotItems.image.clone();
                    cloneGroup.appendChild(cloneImage)
                        .attr(attr);
                }

                if (plotItems.label && !cloneLabel) {
                    cloneLabel = plotItems.cloneLabel =
                        plotItems.label.clone();
                    cloneGroup.appendChild(cloneLabel)
                        .attr(attr);
                }

                cloneGroup.show();
            },

            dragMove: function(dx, dy, px, py, event, chart) {
                // move will be called with dx and dy
                var ele = this,
                    data = ele.data('drag-options'),
                    plotItems = data.plotItems,
                    startX = data.bBoxX + dx,
                    endX = data.bBoxX2 + dx,
                    startY = data.bBoxY + dy,
                    endY = data.bBoxY2 + dy,
                    transform;

                //bound limits
                if (startX < data.boundaryLeft) {
                    dx = data.boundaryLeft - data.bBoxX;
                }
                if (endX > data.boundaryRight) {
                    dx = data.boundaryRight - data.bBoxX2;
                }
                if (startY < data.boundaryTop) {
                    dy = data.boundaryTop - data.bBoxY;
                }
                if (endY > data.boundaryBottom) {
                    dy = data.boundaryBottom - data.bBoxY2;
                }

                transform = data._transformObj = {
                    transform: 't' + (data.origX + dx) + COMMA +
                        (data.origY + dy)
                };

                ele.attr(transform);
                plotItems.cloneGraphic && plotItems.cloneGraphic.attr(transform);
                plotItems.cloneImage && plotItems.cloneImage.attr(transform);
                plotItems.cloneLabel && plotItems.cloneLabel.attr(transform);

                if (!data.draged) {
                    plotEventHandler.call(ele, chart, event, 'DataplotDragStart');
                }

                data.draged = true;
                data.lastX = dx;
                data.lastY = dy;
            },

            dragUp: function(event) {
                var ele = this,
                    data = ele.data('drag-options'),
                    plotItems = data.plotItems,
                    chart = data.chart,
                    xAxis = chart.xAxis[0],
                    yAxis = chart.yAxis[0],
                    logic = chart.logic,
                    tooltipSepChar = logic.tooltipSepChar,
                    numberFormatter = logic.numberFormatter,
                    dataObj = data.dataObj,
                    sourceEvent = 'dataplotdragend',
                    eventCord,
                    reflowUpdate,
                    eventArgs,
                    actualX,
                    actualY,
                    conArr,
                    valX,
                    valY,
                    l,
                    i;
                if (data.draged) {
                    // restoring state with respect to original state
                    data.lastX += data.origX;
                    data.lastY += data.origY;

                    actualX = dataObj._xPos + data.lastX;
                    actualY = dataObj._yPos + data.lastY;

                    //start connectors
                    conArr = data.startConnectors;
                    l = conArr.length;
                    for (i = 0; i < l; i += 1) {
                        conArr[i].updateFromPos(actualX, actualY);
                    }
                    //end connectors
                    conArr = data.endConnectors;
                    l = conArr.length;
                    for (i = 0; i < l; i += 1) {
                        conArr[i].updateToPos(actualX, actualY);
                    }

                    plotItems.label && plotItems.label.attr(data._transformObj);
                    plotItems.image && plotItems.image.attr(data._transformObj);
                    plotItems.graphic && plotItems.graphic.attr(data._transformObj);

                    valX = xAxis.getAxisPosition(actualX, 1); // find the xValue and by its xPosition
                    valY = yAxis.getAxisPosition(actualY, 1); // find the yValue and by its yPosition

                    if (!dataObj._isUserTooltip && dataObj.toolText !== BLANK) {
                        dataObj.toolText = dataObj._toolTextStr + numberFormatter.dataLabels(valX) +
                            tooltipSepChar + numberFormatter.dataLabels(valY);
                    }

                    eventArgs = ele.data('eventArgs');
                    dataObj.x = eventArgs.x = valX;
                    dataObj.y = eventArgs.y = valY;

                    eventCord = getMouseCoordinate(chart.container, event);
                    eventCord.sourceEvent = sourceEvent;

                    // Fire the ChartUpdated event
                    lib.raiseEvent('chartupdated', extend2(eventCord, eventArgs),
                        chart.logic.chartInstance);
                    // Fire the dataplotDragEnd event
                    plotEventHandler.call(ele, chart, event, sourceEvent);

                    //Store currend updated x, y for resize
                    // Save state
                    reflowUpdate = {
                        hcJSON: {
                            series: []
                        }
                    };
                    reflowUpdate.hcJSON.series[data.datasetIndex] = {
                        data: []
                    };
                    reflowUpdate.hcJSON.series[data.datasetIndex].data[data.pointIndex] = {
                        //update in _ options also
                        _options: {
                            x: valX,
                            y: valY
                        },
                        x: valX,
                        y: valY,
                        toolText: dataObj.toolText,
                        displayValue: dataObj.displayValue
                    };
                    extend2(logic.chartInstance.jsVars._reflowData,
                        reflowUpdate, true);
                }

                plotItems.cloneGroup && plotItems.cloneGroup.hide();
            }

        }, renderer['renderer.cartesian']);

        renderer('renderer.dragcolumn2d', {
            drawTracker: function(plot, dataOptions, index) {
                var chart = this,
                    paper = chart.paper,
                    yAxis = chart.yAxis[0],
                    dataObj = plot.data[index],
                    yPos = yAxis.getAxisPosition(dataObj.y),
                    plotItem = plot.items[index],
                    TRACKER_HEIGHT = hasTouch ? 40 : 10,
                    gTracker = chart.layers.tracker, //requird for series drawing
                    trackerEle = plotItem && plotItem.dragTracker || null,
                    dragStart = chart.dragStart,
                    dragUp = chart.dragUp,
                    dragMove = chart.dragMove,
                    attr = {
                        stroke: TRACKER_FILL,
                        'stroke-width': TRACKER_HEIGHT,
                        ishot: true,
                        cursor: hasSVG && 'ns-resize' || 'n-resize'
                    },
                    plotLines = yAxis && yAxis.axisData && yAxis.axisData.plotLines,
                    yAxisPlotLines = chart._yAxisPlotLines ||
                        (chart._yAxisPlotLines = []),
                    i = 0,
                    length,
                    plotLineObj,
                    bBox,
                    path;

                // Storing px value of yAxis plotLines in series
                // to be use for snapping while drag
                if (!yAxisPlotLines.length) {
                    for (length = plotLines.length; i < length; i += 1) {
                        plotLineObj = plotLines[i];
                        if (plotLineObj.isGrid) {
                            yAxisPlotLines.push(yAxis.getAxisPosition(plotLineObj.value));
                        }
                    }
                }

                if (dataObj.y !== null && dataObj.allowDrag) {
                    bBox = plotItem.graphic.getBBox();
                    path = [M, bBox.x, yPos,
                        L, bBox.x + bBox.width, yPos, Z
                    ];
                    if (trackerEle) {
                        trackerEle.animate({
                            d: path
                        })
                            .attr(attr);
                    } else {
                        trackerEle = plotItem.dragTracker = paper.path(path, gTracker)
                            .attr(attr);
                    }

                    trackerEle.drag(dragMove, dragStart, dragUp)
                        .data('drag-options', {
                            items: plotItem,
                            yPos: yPos,
                            chart: chart,
                            datasetIndex: plot.index,
                            pointIndex: index,
                            dataOptions: dataOptions,
                            dataObj: dataObj
                        });

                    plotItem.dragTracker = trackerEle;
                }
            },

            dragStart: function() {
                var ele = this,
                    data = ele.data('drag-options'),
                    chart = data.chart,
                    yAxis = chart.yAxis[0],
                    yMax = yAxis.max,
                    yMin = yAxis.min,
                    bBox = ele.getBBox();
                data.barH = data.items.graphic.getBBox().height;

                data.isAllPositive = yMax > 0 && yMin > 0;
                data.isAllPositiveZero = yMax > 0 && yMin >= 0;
                data.isAllNegative = yMax < 0 && yMin < 0;
                data.isAllNegativeZero = yMax <= 0 && yMin < 0;
                data.isPositiveNegative = yMax > 0 && yMin < 0;

                data.boundaryTop = chart.canvasTop,
                data.boundaryBottom = chart.canvasTop + chart.canvasHeight,

                data.bBoxY = bBox.y;
                data.bBoxY2 = bBox.y2 || (bBox.y + bBox.height);
                data.startValue = data.dataObj.y;

                // store original x, y positions
                data.origX = data.lastX || (data.lastX = 0);
                data.origY = data.lastY || (data.lastY = 0);
                data.draged = false;
            },

            dragMove: function(dx, dy) {
                // move will be called with dx and dy
                var ele = this,
                    data = ele.data('drag-options'),
                    items = data.items,
                    dataObj = data.dataObj,
                    chart = data.chart,
                    chartOptions = chart.options.chart,
                    yAxis = chart.yAxis[0],
                    logic = chart.logic,
                    NumberFormatter = logic.numberFormatter,
                    threshold = yAxis.yBasePos,
                    dataLabel = items.dataLabel,
                    shapeAttr = {},
                    endY = data.bBoxY2 + dy,
                    startY = data.bBoxY + dy,
                    canvasBottom = chart.canvasBottom,
                    lowerDragBoundary = dataObj.allowNegDrag ? canvasBottom :
                        threshold,
                    canvasTop = chart.canvasTop,
                    setBorderWidth = parseFloat(dataObj.borderWidth) || 0,
                    hasValidCanvasBorder = chartOptions.isCanvasBorder,
                    isAllNegativeZero = data.isAllNegativeZero,
                    isPositiveNegative = data.isPositiveNegative,
                    dataOptions = data.dataOptions,
                    eventArgs,
                    value,
                    formattedVal,
                    actualY,
                    transform;

                //bound limits
                if (startY < data.boundaryTop) {
                    dy = data.boundaryTop - data.bBoxY;
                }
                if (endY > lowerDragBoundary) {
                    dy = lowerDragBoundary - data.bBoxY2;
                }

                transform = data._transformObj = {
                    transform: 't' + 0 + COMMA + (data.origY + dy)
                };

                if (!data.draged) {
                    eventArgs = {
                        dataIndex: data.pointIndex + 1,
                        datasetIndex: dataOptions.__i + 1,
                        startValue: data.startValue,
                        datasetName: dataOptions.name
                    };
                    /**
                     * The four dragable charts: `dragnode`, `dragcolumn2d`, `dragline` and `dragarea` fires this event
                     * when their data plots are just being dragged.
                     *
                     * @event FusionCharts#dataplotDragStart
                     * @group chart-powercharts:drag
                     */
                    global.raiseEvent('dataplotDragStart', eventArgs, chart.logic.chartInstance);
                }

                actualY = data.yPos + dy;
                if (actualY <= threshold) {
                    shapeAttr.y = actualY;
                    shapeAttr.height = threshold - actualY;
                } else { // Negative y move
                    shapeAttr.y = threshold;
                    shapeAttr.height = actualY - threshold;
                }

                // start base hotfix
                if (hasValidCanvasBorder && !isPositiveNegative) {
                    // hotfix top when all columns are drawn from top
                    if (isAllNegativeZero) {
                        shapeAttr.y -= shapeAttr.y - (canvasTop -
                            setBorderWidth / 2);
                    }
                    // hotfix bottom when all columns are drawn from bottom
                    else {
                        shapeAttr.height = (canvasBottom - shapeAttr.y) +
                            setBorderWidth / 2;
                    }
                }

                // reposition tracker
                ele.attr(transform);
                // reposition column
                items.graphic.animate(shapeAttr);
                data.shapeAttr = shapeAttr;

                // Positioning dataLabel
                value = data.value = mathRound(yAxis.getAxisPosition(actualY, 1) * DECIMALS) / DECIMALS;
                formattedVal = NumberFormatter.dataLabels(value);

                dragChartsComponents.pointUpdate(dataObj, formattedVal, value);
                if (dataLabel) {
                    chart.drawPlotColumnLabel(chart.plots[data.datasetIndex],
                        data.dataOptions, data.pointIndex, undefined, actualY)
                        .attr('text', data.dataObj.displayValue);
                }
                data.draged = true;
                data.lastX = dx;
                data.lastY = dy;
            },

            dragUp: function() {
                var ele = this,
                    data = ele.data('drag-options'),
                    chart = data.chart,
                    chartOptions = chart.options.chart,
                    logic = chart.logic,
                    doNotSnap = !chartOptions.doNotSnap,
                    dataObj = data.dataObj,
                    dataOptions = data.dataOptions,
                    actualY,
                    snappedY,
                    eventArgs,
                    eventArgsArr,
                    reflowUpdate;

                if (data.draged) {
                    actualY = data.yPos + data.lastY;
                    // Snapping
                    if (doNotSnap) {
                        snappedY = dragChartsComponents.snapPoint(chart, dataObj,
                            actualY);
                        // Forcefully call the move function to resize the data
                        // if value snapped
                        if (snappedY - actualY) {
                            chart.dragMove.call(ele, 0, snappedY - data.yPos);
                        }
                    }
                    data.yPos = snappedY;
                    // restoring state with respect to original state
                    data.lastX += data.origX;
                    data.lastY += data.origY;

                    eventArgs = {
                        dataIndex: data.pointIndex + 1,
                        datasetIndex: dataOptions.__i + 1,
                        startValue: data.startValue,
                        endValue: (data.dataObj.y = data.value),
                        datasetName: dataOptions.name
                    };
                    eventArgsArr = [
                        chart.logic.chartInstance.id,
                        eventArgs.dataIndex,
                        eventArgs.datasetIndex,
                        eventArgs.datsetName,
                        eventArgs.startValue,
                        eventArgs.endValue
                    ];
                    /**
                     * The four dragable charts: `dragnode`, `dragcolumn2d`, `dragline` and `dragarea` fires this event
                     * when their data plots are stopped being dragged.
                     *
                     * @event FusionCharts#dataplotDragEnd
                     * @group chart-powercharts:drag
                     */
                    global.raiseEvent('dataplotDragEnd', eventArgs, chart.logic.chartInstance);

                    // Fire the ChartUpdated event
                    lib.raiseEvent('chartupdated', eventArgs, chart.logic.chartInstance, eventArgsArr);

                    // Save state
                    reflowUpdate = {
                        hcJSON: {
                            series: []
                        }
                    };
                    reflowUpdate.hcJSON.series[data.datasetIndex] = {
                        data: []
                    };

                    // Update tooltip
                    data.items.tracker.attr(data.shapeAttr)
                        .tooltip(dataObj.toolText);

                    reflowUpdate.hcJSON.series[data.datasetIndex]
                        .data[data.pointIndex] = {
                            y: data.value,
                            toolText: dataObj.toolText,
                            displayValue: dataObj.displayValue
                        };
                    // Update data min and max
                    dragChartsComponents.setMinMaxValue(chart);

                    extend2(logic.chartInstance.jsVars._reflowData, reflowUpdate,
                        true);
                }
            }

        }, renderer['renderer.cartesian']);

        renderer('renderer.dragline', {
            drawTracker: function(plot, dataOptions, index) {
                var chart = this,
                    paper = chart.paper,
                    yAxis = chart.yAxis[0],
                    xAxis = chart.xAxis[0],
                    dataObj = plot.data[index],
                    plotItem = plot.items[index],
                    TRACKER_RADIUS = hasTouch ? 20 :
                        mathMax(dataObj.marker && dataObj.marker.radius || 0, 5),
                    gTracker = chart.layers.tracker, //requird for series drawing
                    trackerEle = plotItem.tracker || null,
                    dragStart = chart.dragStart,
                    dragUp = chart.dragUp,
                    dragMove = chart.dragMove,
                    attr = {
                        fill: TRACKER_FILL,
                        'stroke-width': 0,
                        cursor: hasSVG && 'ns-resize' || 'n-resize'
                    },
                    plotLines = yAxis && yAxis.axisData && yAxis.axisData.plotLines,
                    yAxisPlotLines = chart._yAxisPlotLines || (chart._yAxisPlotLines = []),
                    i = 0,
                    yPos,
                    xPos,
                    length,
                    plotLineObj;

                // Storing px value of yAxis plotLines in series
                // to be use for snapping while drag
                if (!yAxisPlotLines.length) {
                    for (length = plotLines.length; i < length; i += 1) {
                        plotLineObj = plotLines[i];
                        if (plotLineObj.isGrid) {
                            yAxisPlotLines.push(yAxis.getAxisPosition(plotLineObj.value));
                        }
                    }
                }

                if (dataObj.y !== null && dataObj.allowDrag) {
                    xPos = xAxis.getAxisPosition(index);
                    yPos = yAxis.getAxisPosition(dataObj.y);
                    if (!trackerEle) {
                        trackerEle = plotItem.tracker = paper.circle(xPos,
                            yPos, TRACKER_RADIUS, gTracker)
                            .attr(attr);
                    }
                    trackerEle.attr({
                        cursor: hasSVG && 'ns-resize' || 'n-resize',
                        ishot: true
                    })
                        .drag(dragMove, dragStart, dragUp)
                        .data('drag-options', {
                            items: plot.items,
                            yPos: yPos,
                            chart: chart,
                            datasetIndex: plot.index,
                            pointIndex: index,
                            dataOptions: dataOptions,
                            dataObj: dataObj
                        });
                }
            },

            dragStart: function() {
                var ele = this,
                    data = ele.data('drag-options'),
                    items = data.items,
                    index = data.pointIndex,
                    nextItems = items[index + 1],
                    currItems = items[index],
                    nextGraph = data.nextGraph = nextItems && nextItems.connector,
                    currGraph = data.currGraph = currItems && currItems.connector,
                    chart = data.chart;

                data._origY = data._lastY || (data._lastY = 0);

                data.boundaryTop = chart.canvasTop;
                data.boundaryBottom = chart.canvasTop + chart.canvasHeight;

                data.currPath = currGraph && currGraph.attr('path');
                data.nextPath = nextGraph && nextGraph.attr('path');
                data.startValue = data.dataObj.y;

                // store original x, y positions
                data.origY = ele.attr('cy');
                data.origX = ele.attr('cx');

                data.draged = false;
            },

            dragMove: function(dx, dy) {
                // move will be called with dx and dy
                var ele = this,
                    data = ele.data('drag-options'),
                    items = data.items[data.pointIndex],
                    nextPath = data.nextPath,
                    currPath = data.currPath,
                    dataObj = data.dataObj,
                    chart = data.chart,
                    plot = chart.elements.plots[data.datasetIndex],
                    yAxis = chart.yAxis[0],
                    logic = chart.logic,
                    NumberFormatter = logic.numberFormatter,
                    threshold = yAxis.yBasePos,
                    dataLabel = items.dataLabel,
                    lowerDragBoundary = dataObj.allowNegDrag ? data.boundaryBottom :
                        threshold,
                    dataOptions = data.dataOptions,
                    eventArgs,
                    value,
                    formattedVal,
                    actualY;

                actualY = data.origY + dy;

                if (!data.draged) {
                    eventArgs = {
                        dataIndex: data.pointIndex + 1,
                        datasetIndex: dataOptions.__i + 1,
                        startValue: data.startValue,
                        datasetName: dataOptions.name
                    };
                    global.raiseEvent('dataplotDragStart', eventArgs, chart.logic.chartInstance);
                }

                //bound limits
                if (actualY < data.boundaryTop) {
                    dy = data.boundaryTop - data.origY;
                }
                if (actualY > lowerDragBoundary) {
                    dy = lowerDragBoundary - data.origY;
                }
                actualY = data.origY + dy;

                ele.animate({
                    cy: actualY
                });

                items.graphic && items.graphic.attr('transform', (t + '0' + COMMA + (data._origY + dy)));

                if (nextPath && nextPath[0] && data.nextGraph) {
                    if (hasSVG) {
                        nextPath[0][2] = actualY;
                    } else {
                        nextPath[2] = actualY;
                    }
                    data.nextGraph.animate({
                        path: nextPath
                    });
                }
                if (currPath && currPath[1] && data.currGraph) {
                    if (hasSVG) {
                        currPath[1][2] = actualY;
                    } else {
                        currPath[5] = actualY;
                    }
                    data.currGraph.animate({
                        path: currPath
                    });
                }

                // Positioning dataLabel
                value = dataObj.y = data.value = mathRound(yAxis.getAxisPosition(actualY, 1) * DECIMALS) / DECIMALS;
                formattedVal = NumberFormatter.dataLabels(value);

                dragChartsComponents.pointUpdate(dataObj, formattedVal, value);

                if (dataLabel) {
                    chart.drawPlotLineLabel(chart.plots[data.datasetIndex],
                        data.dataOptions, data.pointIndex, data.origX, actualY)
                        .attr('text', dataObj.displayValue);
                }
                data.draged = true;
                data.lastY = dy;

                // Recalculate the path for Area
                chart.getAreaPath && plot.graphic && plot.graphic.attr({
                    path: chart.getAreaPath(plot.data)
                });

            },

            dragUp: function() {
                var ele = this,
                    data = ele.data('drag-options'),
                    chart = data.chart,
                    chartOptions = chart.options.chart,
                    logic = chart.logic,
                    doNotSnap = !chartOptions.doNotSnap,
                    dataObj = data.dataObj,
                    dataOptions = data.dataOptions,
                    actualY,
                    eventArgsArr,
                    snappedY,
                    eventArgs,
                    reflowUpdate;

                if (data.draged) {
                    actualY = data.yPos + data.lastY;
                    // Snapping
                    if (doNotSnap) {
                        snappedY = dragChartsComponents.snapPoint(chart, dataObj,
                            actualY);
                        // Forcefully call the move function to resize the data
                        // if value snapped
                        if (snappedY - actualY) {
                            chart.dragMove.call(ele, 0, snappedY - data.yPos);
                        }
                    }
                    data.yPos = snappedY;
                    // restoring state with respect to original state
                    data._lastY = data.lastY + data._origY;
                    data.lastY += data.origY;

                    eventArgs = {
                        dataIndex: data.pointIndex + 1,
                        datasetIndex: dataOptions.__i + 1,
                        startValue: data.startValue,
                        endValue: (data.dataObj.y = data.value),
                        datasetName: dataOptions.name
                    };
                    eventArgsArr = [
                        chart.logic.chartInstance.id,
                        eventArgs.dataIndex,
                        eventArgs.datasetIndex,
                        eventArgs.datasetName,
                        eventArgs.startValue,
                        eventArgs.endValue
                    ];

                    global.raiseEvent('dataplotDragEnd', eventArgs, chart.logic.chartInstance);

                    // Fire the ChartUpdated event
                    lib.raiseEvent('chartupdated', eventArgs, chart.logic.chartInstance,
                        eventArgsArr);

                    // Save state
                    reflowUpdate = {
                        hcJSON: {
                            series: []
                        }
                    };
                    reflowUpdate.hcJSON.series[data.datasetIndex] = {
                        data: []
                    };
                    reflowUpdate.hcJSON.series[data.datasetIndex]
                        .data[data.pointIndex] = {
                            y: data.value,
                            toolText: dataObj.toolText,
                            displayValue: dataObj.displayValue
                        };
                    // Update tooltip
                    data.items[data.pointIndex].tracker.tooltip(dataObj.toolText);

                    // Update data min and max
                    dragChartsComponents.setMinMaxValue(chart);

                    extend2(logic.chartInstance.jsVars._reflowData, reflowUpdate,
                        true);
                }
            }
        }, renderer['renderer.cartesian']);

        renderer('renderer.dragarea', {
            getAreaPath: function(dataArr) {
                var chart = this,
                    xAxis = chart.xAxis[0],
                    yAxis = chart.yAxis[0],
                    yBasePos = yAxis.yBasePos,
                    length = dataArr.length,
                    i = 0,
                    areaPath = [],
                    yPos = [],
                    xPos = [],
                    lastNull = true,
                    areaStartIndex,
                    dataObj,
                    nextVal,
                    prevVal;

                for (; i < length; i += 1) {
                    dataObj = dataArr[i];
                    xPos[i] = xAxis.getAxisPosition(i);
                    yPos[i] = null;
                    if (dataObj.y !== null) {
                        yPos[i] = yAxis.getAxisPosition(dataObj.y);
                        prevVal = dataArr[i - 1] ? dataArr[i - 1].y : null;
                        nextVal = dataArr[i + 1] ? dataArr[i + 1].y : null;
                        if (prevVal !== null) {
                            if (lastNull) {
                                areaPath.push(M, xPos[i - 1], yBasePos, L,
                                    xPos[i - 1], yPos[i - 1], L, xPos[i], yPos[i]);
                                areaStartIndex = i - 1;
                            } else {
                                areaPath.push(L, xPos[i], yPos[i]);
                            }
                            (nextVal === null) && areaPath.push(L, xPos[i],
                                yBasePos, L, xPos[areaStartIndex], yBasePos);
                            lastNull = false;
                        } else {
                            lastNull = true;
                        }
                    }
                }

                return areaPath;
            }
        }, renderer['renderer.dragline']);

        /**
         * The renderering definition for spline plots.
         *
         * @id TypeAPI['renderer.spline']
         * @return TypeAPI
         */
        renderer('renderer.heatmap', {
            drawPlotHeatmap: function(plot, dataOptions) {
                var chart = this,
                    data = plot.data,
                    ln = data.length,
                    plotItems = plot.items,
                    datasetGraphics = plot.graphics = (plot.graphics || []),
                    paper = chart.paper,
                    layers = chart.layers,
                    options = chart.options,
                    chartOptions = options.chart,
                    showHoverEffect = chartOptions.showHoverEffect,
                    // tooltip options
                    tooltipOptions = options.tooltip || {},
                    isTooltip = tooltipOptions.enabled !== false,

                    // Directly Accessing chart definition JSON Data
                    seriesOptions = options.plotOptions.series,
                    xAxis = chart.xAxis[dataOptions.xAxis || 0],
                    yAxis = chart.yAxis[dataOptions.yAxis || 0],


                    animationDuration = isNaN(+seriesOptions.animation) &&
                        seriesOptions.animation.duration ||
                        seriesOptions.animation * 1000,

                    seriesVisibility = dataOptions.visible === false ?
                        'hidden' : 'visible',
                    pointVisible,
                    pointVisibility,

                    xAxisZeroPos = xAxis.getAxisPosition(0),
                    xAxisFirstPos = xAxis.getAxisPosition(1),
                    yAxisZeroPos = yAxis.getAxisPosition(0),
                    yAxisFirstPos = yAxis.getAxisPosition(1),
                    groupMaxWidth = xAxisFirstPos - xAxisZeroPos,
                    groupMaxHeight = yAxisZeroPos - yAxisFirstPos,

                    plotRadius = pluckNumber(chartOptions.useRoundEdges, 0),
                    borderColor = dataOptions.borderColor,
                    borderWidth = dataOptions.borderWidth,
                    dashStyle = dataOptions.dashStyle,

                    xPosOffset = groupMaxWidth / 2,
                    yPosOffset = groupMaxHeight / 2,

                    datasetLayer = layers.dataset = layers.dataset ||
                        paper.group('dataset-orphan'),
                    dataLabelsLayer = layers.datalabels = layers.datalabels ||
                        paper.group('datalables').insertAfter(datasetLayer),
                    trackerLayer = layers.tracker,
                    chartW = chart.chartWidth,
                    chartH = chart.chartHeight,
                    trackerClickFN = function(data) {
                        var ele = this;
                        plotEventHandler.call(ele, chart, data);
                    },
                    trackerHoverFN = function(data) {
                        var ele = this;
                        plotEventHandler.call(ele,
                            chart, data, ROLLOVER);
                    },
                    trackerOutFN = function(data) {
                        var ele = this;
                        plotEventHandler.call(ele,
                            chart, data, ROLLOUT);
                    },
                    getHoverFN = function(elem, fill) {
                        return function() {
                            elem.attr({
                                'fill': toRaphaelColor(fill)
                            });
                        };
                    },
                    fillColor,
                    eventArgs,
                    setElem,
                    hotElem,
                    isNegative,
                    i,
                    ii,
                    set,
                    setLink,
                    toolText,
                    valEles,
                    x,
                    y,
                    xPos,
                    yPos,
                    yPosWithoutOffset,
                    targetGroup;

                // hide the data labels group. Will be visible after animation completes
                if (animationDuration) {
                    dataLabelsLayer.attr({
                        transform: 't' + chartW + COMMA + chartH
                    });
                    chart.animationCompleteQueue.push({
                        fn: function () {
                            dataLabelsLayer.attr({
                                transform: 't' + 0 + COMMA + 0
                            });
                        },
                        scope: this
                    });
                }

                // define groups
                targetGroup = datasetLayer;

                //draw plots
                for (i = 0; i < ln; i += 1) {
                    set = data[i];
                    y = set.y;

                    setElem = null;
                    isNegative = false;

                    if (y !== null) {
                        setLink = set.link;
                        toolText = set.toolText || set.tooltext;

                        fillColor = toRaphaelColor(set.setColor || set.color);

                        pointVisible = set.visible;
                        pointVisibility = pointVisible && pointVisible === false ?
                            'hiddden' : seriesVisibility;

                        x = pluckNumber(set.x, i);
                        xPos = xAxis.getAxisPosition(x) - xPosOffset;
                        yPosWithoutOffset = yAxis.getAxisPosition(y);
                        yPos = yPosWithoutOffset + yPosOffset;

                        eventArgs = {
                            link: setLink,
                            value: set.value,
                            columnId: set.columnId,
                            rowId: set.rowId,
                            displayValue: set.displayValue,
                            tlLabel: set.tlLabel,
                            trLabel: set.trLabel,
                            blLabel: set.blLabel,
                            brLabel: set.brLabel,
                            toolText: toolText,
                            id: plot.userID,
                            datasetIndex: plot.index,
                            datasetName: plot.name,
                            visible: plot.visible
                        };

                        setElem = paper.rect(xPos, yPosWithoutOffset,
                            groupMaxWidth, groupMaxHeight,
                            plotRadius, targetGroup)
                            .attr({
                                fill: fillColor,
                                stroke: borderColor,
                                'stroke-width': borderWidth,
                                'stroke-dasharray': dashStyle,
                                'stroke-linejoin': 'miter',
                                'shape-rendering': plotRadius === 0 ? CRISP : '',
                                'cursor': setLink ? 'pointer' : '',
                                'opacity': animationDuration ? 0 : set.setAlpha && (+set.setAlpha / 100) || 1

                            })
                            .crisp()
                            .attr({
                                'visibility': pointVisibility
                            });
                        if (animationDuration) {
                            setElem.animate({
                                    'opacity': set.setAlpha && (+set.setAlpha / 100) || 1
                                },
                                animationDuration, 'normal',
                                chart.getAnimationCompleteFn());

                        }

                        if (showHoverEffect || isTooltip || setLink) {
                            hotElem = paper.rect(xPos, yPosWithoutOffset,
                                groupMaxWidth, groupMaxHeight,
                                plotRadius, trackerLayer)
                                .attr({
                                    'cursor': setLink ? 'pointer' : '',
                                    stroke: TRACKER_FILL,
                                    'stroke-width': borderWidth,
                                    'fill': TRACKER_FILL,
                                    ishot: true
                                })
                                .data('eventArgs', eventArgs);
                        }


                        (hotElem || setElem)
                            .click(trackerClickFN)
                            .hover(trackerHoverFN, trackerOutFN)
                            .tooltip(toolText);

                        if (showHoverEffect === 1 && setElem && hotElem) {
                            hotElem.hover(getHoverFN(setElem, set.hoverColor),
                                getHoverFN(setElem, set.setColor || set.color));
                        }

                        plotItems[i] = {
                            index: i,
                            value: set.value,
                            graphic: setElem,
                            tracker: hotElem,
                            dataLabel: null,
                            dataLabels: [],
                            visible: pointVisible || pointVisibility !== 'hidden'
                        };

                        // Drawing of displayValue
                        valEles = chart.drawLabelHeatmap.call(chart, plot, dataOptions, i);

                        setElem && datasetGraphics.push(setElem);
                        hotElem && datasetGraphics.push(hotElem);
                        for (ii in valEles) {
                            !plotItems[i].dataLabels && (plotItems[i].dataLabels = []);
                            valEles[ii] && datasetGraphics.push(valEles[ii]);
                            plotItems[i].dataLabels.push(valEles[ii]);
                        }
                    }
                    chart.drawTracker &&
                        chart.drawTracker.call(chart, plot, i, xPos, yPos);
                }

                plot.visible = (dataOptions.visible !== false);

                return plot;
            },

            // drawing of the dataValues
            drawLabelHeatmap: function(plot, dataOptions, i) {
                var chart = this,
                    plotItem = plot.items[i],
                    set = plot.data[i],
                    graphic = plotItem.graphic,
                    options = chart.options,
                    seriesOptions = options.plotOptions.series,
                    paper = chart.paper,
                    layers = chart.layers,
                    dataLabelsLayer = layers.datalabels, //requird for dataplot labels
                    dataLabels = seriesOptions.dataLabels,
                    style = dataLabels.style,
                    visibility = dataOptions.visible === false ?
                        HIDDEN : VISIBLE,
                    displayValue = set.displayValue,

                    tlLabel = set.tlLabel,
                    trLabel = set.trLabel,
                    blLabel = set.blLabel,
                    brLabel = set.brLabel,

                    tlStyle = dataLabels.tlLabelStyle,
                    trStyle = dataLabels.trLabelStyle,
                    blStyle = dataLabels.blLabelStyle,
                    brStyle = dataLabels.brLabelStyle,

                    tlLabelEle = plotItem.tlLabel,
                    trLabelEle = plotItem.trLabel,
                    blLabelEle = plotItem.blLabel,
                    brLabelEle = plotItem.brLabel,

                    smartLabel = chart.smartLabel,
                    valEle = plotItem.dataLabel,
                    MAX_PERCENT_SPACE = 0.9,
                    POINT_FIVE = 0.5,
                    labelsArr = [],
                    css = {
                        fontFamily: style.fontFamily,
                        fontSize: style.fontSize,
                        lineHeight: style.lineHeight,
                        fontWeight: style.fontWeight,
                        fontStyle: style.fontStyle
                    },

                    maxWidth,
                    maxHeight,
                    pointW,
                    pointH,
                    pointX,
                    pointY,
                    isTLLabel,
                    isTRLabel,
                    isBLLabel,
                    isBRLabel,
                    smartTextObj,
                    yPos,
                    xPos,
                    textX,
                    colBBox,
                    textY;

                colBBox = graphic.getBBox();
                pointW = colBBox.width;
                pointH = colBBox.height;
                pointX = colBBox.x;
                pointY = colBBox.y;

                // Setting style for smartLabel
                smartLabel.setStyle(style);

                // Drawing of displayValue
                if (defined(displayValue) && displayValue !== BLANK) {
                    // First render the value text
                    // Get the displayValue text according to the
                    smartTextObj = smartLabel.getSmartText(displayValue,
                        pointW, pointH, false);
                    displayValue = smartTextObj.text;

                    if (!valEle) {
                        valEle = plotItem.dataLabel = paper.text(dataLabelsLayer);
                    }

                    textY = pointY + (pointH * 0.5);
                    textX = pointX + (pointW * 0.5);

                    valEle.attr({
                        text: displayValue,
                        title: (smartTextObj.tooltext || ''),
                        visibility: visibility,
                        fill: style.color,
                        x: textX,
                        y: textY,
                        'text-bound': [style.backgroundColor, style.borderColor,
                            style.borderThickness, style.borderPadding,
                            style.borderRadius, style.borderDash
                        ]
                    })
                        .css(css);
                    labelsArr.push(valEle);
                }

                isTLLabel = (defined(tlLabel) &&
                    tlLabel !== BLANK);
                isTRLabel = (defined(trLabel) &&
                    trLabel !== BLANK);
                isBLLabel = (defined(blLabel) &&
                    blLabel !== BLANK);
                isBRLabel = (defined(brLabel) &&
                    brLabel !== BLANK);

                maxWidth = pointW * (isTLLabel && isTRLabel ?
                    POINT_FIVE : MAX_PERCENT_SPACE);
                maxHeight = (pointH - (smartTextObj && smartTextObj.height || 0)) * 0.5;
                // For top labels
                yPos = pointY + GUTTER_4;
                if (isTLLabel) {
                    // Setting style for smartLabel
                    smartLabel.setStyle(tlStyle);
                    smartTextObj = smartLabel.getSmartText(tlLabel,
                        maxWidth, maxHeight, false);
                    displayValue = smartTextObj.text;
                    // Get the x and y position of the dataValue
                    xPos = pointX;
                    if (!tlLabelEle) {
                        tlLabelEle = plotItem.tlLabel = paper.text();
                    }
                    tlLabelEle.attr({
                        text: displayValue,
                        title: (smartTextObj.tooltext || ''),
                        visibility: visibility,
                        fill: tlStyle.color,
                        'text-anchor': POSITION_START,
                        'vertical-align': POSITION_TOP,
                        x: xPos + GUTTER_4,
                        y: yPos
                    })
                        .css(tlStyle);
                    dataLabelsLayer.appendChild(tlLabelEle);
                    labelsArr.push(tlLabelEle);
                }

                if (isTRLabel) {
                    // Setting style for smartRabel
                    smartLabel.setStyle(trStyle);
                    smartTextObj = smartLabel.getSmartText(trLabel,
                        maxWidth, maxHeight, false);
                    displayValue = smartTextObj.text;
                    // Get the x and y position of the dataValue
                    xPos = pointX + pointW;
                    if (!trLabelEle) {
                        trLabelEle = plotItem.trLabel = paper.text();
                    }
                    trLabelEle.attr({
                        text: displayValue,
                        title: (smartTextObj.tooltext || ''),
                        visibility: visibility,
                        fill: trStyle.color,
                        'text-anchor': POSITION_END,
                        'vertical-align': POSITION_TOP,
                        x: xPos - GUTTER_4,
                        y: yPos
                    })
                        .css(trStyle);
                    dataLabelsLayer.appendChild(trLabelEle);
                    labelsArr.push(trLabelEle);
                }

                // For top labels
                yPos = (pointY + pointH) - GUTTER_4;

                if (isBLLabel) {
                    // Setting style for smartRabel
                    smartLabel.setStyle(brStyle);
                    smartTextObj = smartLabel.getSmartText(blLabel,
                        maxWidth, maxHeight, false);
                    displayValue = smartTextObj.text;
                    // Get the x and y position of the dataValue
                    xPos = pointX;
                    if (!blLabelEle) {
                        blLabelEle = plotItem.blLabel = paper.text();
                    }
                    blLabelEle.attr({
                        text: displayValue,
                        title: (smartTextObj.tooltext || ''),
                        visibility: visibility,
                        fill: brStyle.color,
                        'text-anchor': POSITION_START,
                        'vertical-align': POSITION_BOTTOM,
                        x: xPos + GUTTER_4,
                        y: yPos
                    })
                        .css(brStyle);
                    dataLabelsLayer.appendChild(blLabelEle);
                    labelsArr.push(blLabelEle);
                }

                if (isBRLabel) {
                    // Setting style for smartRabel
                    smartLabel.setStyle(blStyle);
                    smartTextObj = smartLabel.getSmartText(brLabel,
                        maxWidth, maxHeight, false);
                    displayValue = smartTextObj.text;
                    // Get the x and y position of the dataValue
                    xPos = pointX + pointW - GUTTER_4;
                    if (!brLabelEle) {
                        brLabelEle = plotItem.brLabel = paper.text();
                    }
                    brLabelEle.attr({
                        text: displayValue,
                        title: (smartTextObj.tooltext || ''),
                        visibility: visibility,
                        fill: blStyle.color,
                        'text-anchor': POSITION_END,
                        'vertical-align': POSITION_BOTTOM,
                        x: xPos,
                        y: yPos
                    })
                        .css(blStyle);
                    dataLabelsLayer.appendChild(brLabelEle);
                    labelsArr.push(brLabelEle);
                }

                return labelsArr;
            },

            setScaleRange: function(start, end) {
                var chart = this,
                    logic = chart.logic,
                    plot = chart.plots[0],
                    visibleAttr = {
                        'visibility': 'visible'
                    },
                    hiddenAttr = {
                        'visibility': 'hidden'
                    },
                    reflowUpdateJSON = {
                        hcJSON: {
                            series: [{}]
                        }
                    },
                    reflowStubSeries = reflowUpdateJSON.hcJSON.series[0],
                    reflowUData = reflowStubSeries.data || (reflowStubSeries.data = []),
                    reflowData = logic.chartInstance.jsVars._reflowData,
                    items = plot.items,
                    item,
                    value,
                    graphic,
                    datalabels,
                    isVisible,
                    updatedItem,
                    itemVisibility,
                    isInRange,
                    setLabelVISFN = function(label) {
                        label.attr(itemVisibility);
                    };

                setTimeout(function() {
                    for (var i in items) {
                        item = items[i];
                        value = item.value;
                        isVisible = item.visible;
                        graphic = item.graphic;
                        updatedItem = reflowUData[i] || (reflowUData[i] = {});
                        datalabels = item.dataLabels;

                        isInRange = value >= start && value <= end;
                        itemVisibility = isInRange ? visibleAttr : hiddenAttr;

                        graphic.attr(itemVisibility);
                        each(datalabels, setLabelVISFN);

                        updatedItem.visible = isInRange;
                    }

                    extend2(reflowData, reflowUpdateJSON, true);


                }, 100);

            }

        }, renderer['renderer.cartesian']);

        renderer('renderer.radar', {

            /* Configure and Create Radar Axis */
            createRadarAxis: function() {
                var chart = this,
                    chartOptions = chart.options,
                    centerX = chart.canvasLeft + (chart.canvasWidth / 2),
                    centerY = chart.canvasTop + (chart.canvasHeight / 2),
                    xAxis = chartOptions.xAxis,
                    yAxis = chartOptions.yAxis instanceof Array ?
                        chartOptions.yAxis[0] : chartOptions.yAxis,

                    catLength = (xAxis.max - xAxis.min) + 1,
                    yRange = mathAbs(yAxis.max - yAxis.min),
                    radius = defined(chartOptions.chart.axisRadius) ?
                        chartOptions.chart.axisRadius : mathMin(centerX, centerY),
                    yTrans,
                    xTrans,
                    startAngle = math.PI / 2, /** @todo have to check if there has any */
                    //attr to supply this value. Kept as before.
                    radarAxis = {};

                //radius can not be less than 0
                if (radius < 0) {
                    radius = mathMin(centerX, centerY);
                }
                // value to pixel convertation factor
                yTrans = radius / yRange;
                //value to angle translation factor
                xTrans = (2 * math.PI) / catLength;
                //store all configuration
                radarAxis.yTrans = yTrans;
                radarAxis.xTrans = xTrans;
                radarAxis.yRange = yRange;
                radarAxis.startAngle = startAngle;
                radarAxis.yMin = yAxis.min;
                radarAxis.centerX = centerX;
                radarAxis.centerY = centerY;
                radarAxis.radius = radius;
                radarAxis.categories = [];
                radarAxis.catLength = catLength;
                radarAxis.yAxis = yAxis;
                radarAxis.xAxis = xAxis;

                //expose it to chart
                chart.radarAxis = radarAxis;

                return radarAxis;

            },

            drawRadarAxis: function() {
                var chart = this,
                    radarAxis = chart.radarAxis,
                    categoriesLN = radarAxis.catLength,
                    xAxis = radarAxis.xAxis,
                    yAxis = radarAxis.yAxis,
                    yMin = yAxis.min,
                    plotLines = yAxis.plotLines,
                    numDiv = plotLines.length,
                    xPlotLines = xAxis.plotLines,
                    xTrans = radarAxis.xTrans,
                    yTrans = radarAxis.yTrans,
                    radius = radarAxis.radius,
                    startAngle = radarAxis.startAngle,
                    CX = chart.canvasLeft + (chart.canvasWidth / 2),
                    CY = chart.canvasTop + (chart.canvasHeight / 2),
                    paper = chart.paper,
                    layers = chart.layers,
                    datasetLayer = layers.dataset = layers.dataset ||
                        paper.group('orphan-dataset').trackTooltip(true),
                    layerBelowDataset = layers.layerBelowDataset = layers.layerBelowDataset ||
                        paper.group('axisbottom').trackTooltip(true),
                    layerAboveDataset = layers.layerAboveDataset = layers.layerAboveDataset ||
                        paper.group('axistop').trackTooltip(true),
                    axisLineGroup = layers.axisLines = layers.axisLines ||
                        paper.group('axis-lines', layerBelowDataset),
                    axisLabelGroup = layers.axisLabels = layers.axisLabels ||
                        paper.group('axis-labels', layerBelowDataset),
                    labelOptions = yAxis.labels,
                    math2PI = math.PI * 2,
                    mathPIBY2 = math.PI / 2,
                    math3PIBY2 = math.PI + mathPIBY2,
                    // tooltip options
                    tooltipOptions = chart.options.tooltip || {},
                    isTooltip = tooltipOptions.enabled !== false,
                    divLine,
                    value,
                    length,
                    angle,
                    modAngle,
                    positionIndex,
                    labelAlign = ['right', 'center', 'left'],
                    str,
                    Px,
                    Py,
                    i,
                    j,
                    first,
                    xLabels = xAxis.labels,
                    gutterHalf = pluckNumber(parseInt(xLabels.style &&
                        xLabels.style.fontSize, 10) * 0.9, 9) / 2,
                    tempRad = radius + xLabels.labelPadding,
                    axisPathArr = [],
                    borderPath = ['M'],
                    numdivPath = [],
                    axisLabelElem,
                    axisPathElem,
                    axisDivElem,
                    axisBorderElem,
                    toolText,
                    trackerElement;

                layerBelowDataset.insertBefore(datasetLayer);
                layerAboveDataset.insertAfter(datasetLayer);

                radarAxis.divline = [];

                //create all divLines path
                for (j = 0; j < numDiv; j += 1) {
                    //add the move to
                    numdivPath[j] = [M];
                    first = true;
                    i = categoriesLN;
                    divLine = plotLines[j];
                    toolText = divLine.tooltext;
                    value = divLine.value;
                    // do the translation
                    while (i--) {
                        length = mathAbs(value - yMin) * yTrans;
                        Px = CX + (length * mathCos(-(startAngle + (i * xTrans))));
                        Py = CY + (length * mathSin(-(startAngle + (i * xTrans))));
                        //add to the divLine path array
                        numdivPath[j].splice(numdivPath[j].length, 0, Px, Py);
                        //after first move to add the line to
                        if (first) {
                            numdivPath[j].push(L);
                            first = false;
                        }
                        //draw the yAxis div labels
                        if (i === 0 && divLine.label) {
                            labelOptions = divLine.label;
                            str = labelOptions.text;
                            if (str || str === 0) {
                                axisLabelElem = paper.text(axisLabelGroup)
                                /*@todo:
                                 * color here is not properly structured.
                                 * if we apply divLine.color axis limits gets hidden
                                 * as alpha is 0 on them
                                 * if we apply labelOptions.style.color all text shows
                                 * same color.
                                 * need to pass correct color.
                                 */
                                .attr({
                                    text: str,
                                    //fill: toRaphaelColor(labelOptions.style.color),
                                    x: Px,
                                    y: Py,
                                    'text-anchor': labelOptions.textAlign === 'right' ? 'end' :
                                    (labelOptions.textAlign === 'left') ? 'start' : 'middle',
                                    'vertical-align': labelOptions.verticalAlign,
                                    rotation: labelOptions.rotation
                                })
                                // without position absolute, IE export sometimes is wrong
                                .css(labelOptions.style);
                            }
                        }
                    }
                    ///close the border
                    numdivPath[j].push('Z');
                    axisDivElem = radarAxis.divline[j] = paper.path(numdivPath[j], axisLineGroup)
                    .attr({
                        'stroke': divLine.color,
                        'stroke-width': divLine.width
                    });
                    // If tooltext is given in trend line, draw a tracker to show the tooltext.
                    if (isTooltip && toolText) {
                        trackerElement = paper.path({
                            stroke: TRACKER_FILL,
                            'stroke-width': mathMax(divLine.width, HTP),
                            'ishot': true,
                            path: numdivPath[j]
                        }, layers.tracker)
                        .toBack()
                        .tooltip(toolText);
                    }
                }

                //draw the axis lines
                first = true; //set the the first flag for the next loop
                i = xPlotLines.length;
                while (i--) {
                    divLine = xPlotLines[i];
                    value = divLine.value;
                    angle = (startAngle + (value * xTrans));
                    modAngle = angle % math2PI;
                    Px = CX + (radius * mathCos(-angle));
                    Py = CY + (radius * mathSin(-angle));
                    //add to the axis path
                    axisPathArr.splice(axisPathArr.length, 0, 'M', CX, CY, 'L', Px, Py);
                    //add to the border path
                    borderPath.splice(borderPath.length, 0, Px, Py);
                    if (first) {
                        borderPath.push('L');
                        first = false;
                    }
                    //draw all category / x-axis labels
                    if (divLine.label) {
                        labelOptions = divLine.label;
                        str = labelOptions.text;
                        if (str || str === 0) {
                            positionIndex = (modAngle > mathPIBY2 && modAngle < math3PIBY2) ? 0 :
                                ((modAngle == mathPIBY2 || modAngle == math3PIBY2) ? 1 : 2);
                            axisLabelElem = paper.text(axisLabelGroup)
                                .attr({
                                    text: str,
                                    x: CX + (tempRad * mathCos(-angle)),
                                    y: CY + (tempRad * mathSin(-angle)) +
                                        (gutterHalf * mathSin(-angle)) + gutterHalf,
                                    'text-anchor': labelAlign[positionIndex] === 'right' ? 'end' :
                                        labelAlign[positionIndex] === 'left' ? 'start' : 'middle',
                                    'vertical-align': labelOptions.verticalAlign,
                                    rotation: labelOptions.rotation
                                })
                                .css(labelOptions.style);
                        }
                    }
                }
                ///close the border
                borderPath.push('Z');
                //draw the axis
                axisPathElem = radarAxis.spikeGraph = paper.path(axisPathArr, axisLineGroup)
                    .attr({
                        'stroke': xAxis.gridLineColor,
                        'stroke-width': pluck(xAxis.gridLineWidth, 1)
                    });

                if (xAxis.showRadarBorder) {
                    axisBorderElem = radarAxis.borderGraph = paper.path(borderPath, axisLineGroup)
                        .toBack()
                        .attr({
                            'stroke': xAxis.radarBorderColor,
                            'stroke-width': pluck(xAxis.radarBorderThickness, 2),
                            fill: xAxis.radarFillColor
                        });
                }
            },

            drawPlotRadar: function(plot, dataOptions) {
                var chart = this,
                    paper = chart.paper,
                    layers = chart.layers,
                    datasetLayer = layers.dataset = layers.dataset ||
                        paper.group('orphan-dataset'),
                    dataLabelsLayer = layers.datalabels = layers.datalabels ||
                        paper.group('datalabels').insertAfter(datasetLayer),
                    trackerLayer = layers.tracker = layers.tracker ||
                        paper.group('hot')
                        .insertAfter(datasetLayer),
                    options = chart.options,
                    trackerRadius = options.chart.anchorTrackingRadius,
                    seriesOptions = options.plotOptions.series,
                    elements = {
                        plots: [],
                        graphic: {}
                    },
                    plotItems = plot.items || {},
                    datasetGraphics = plot.graphics = (plot.graphics || []),
                    radarAxis = chart.radarAxis,
                    data = dataOptions.data || [],
                    dataLength = data.length,
                    centerX,
                    centerY,
                    isHidden = dataOptions.visible === false,
                    seriesVisibility = isHidden ? 'hidden' : 'visible',
                    animationDuration = isNaN(+seriesOptions.animation) &&
                        seriesOptions.animation.duration ||
                        seriesOptions.animation * 1000,
                    yTrans,
                    xTrans,
                    // tooltip options
                    tooltipOptions = options.tooltip || {},
                    isTooltip = tooltipOptions.enabled !== false,
                    yMin,
                    startAngle,
                    plotX,
                    plotY,
                    radarGroup = datasetLayer.radarGroup = datasetLayer.radarGroup ||
                        paper.group('connectors', datasetLayer),
                    anchorGroup = datasetLayer.marker = datasetLayer.marker ||
                        paper.group('anchors', datasetLayer),
                    trackerGroup = trackerLayer.trackers = trackerLayer.trackers ||
                        paper.group('trackers', trackerLayer),
                    chartW = chart.chartWidth,
                    chartH = chart.chartHeight,
                    animationComplete,
                    graphPath = [],
                    symbol,
                    marker,
                    markerRadius,
                    dip,
                    radius,
                    segmentPath,
                    anchorElem,
                    plotElem,
                    valEle,
                    trackerElem,
                    setLink,
                    tooltext,
                    anchorShadow,
                    setRolloverProperties,
                    setRolloutAttr,
                    setRolloverAttr,
                    cursor = options.cursor,
                    trackerCSS = cursor && {
                        cursor: cursor
                    },
                    cartesianRenderer = renderer['renderer.cartesian'],
                    plotItem,
                    imgRef,
                    eventArgs;

                // create layers


                //we need to configure and create radar axis if not alreday
                //created
                if (chart.radarAxis === undefined) {
                    radarAxis = chart.radarAxis = chart.createRadarAxis(dataOptions);
                    //now draw radar axis
                    chart.drawRadarAxis(dataOptions);
                }
                //update axis related vars
                yTrans = radarAxis.yTrans;
                yMin = radarAxis.yMin;
                startAngle = radarAxis.startAngle;
                xTrans = radarAxis.xTrans;
                centerX = radarAxis.centerX;
                centerY = radarAxis.centerY;

                //now lets draw the actual graph
                if (dataLength >= 1) {
                    segmentPath = [];
                    //build the segment line
                    each(data, function(point, i) {
                        valEle = null;
                        //moveTo or lineTo
                        if (!i) {
                            segmentPath.push('M');
                        } else if (i < 2) {
                            segmentPath.push('L');
                        }

                        plotItems[i] = plotItem = elements.plots[i] = {
                            chart: chart,
                            index: i,
                            value: point.y
                        };
                        // normal line to next point
                        if (point.y === null) {
                            segmentPath.push(
                                centerX,
                                centerY
                            );
                        } else {
                            anchorElem = trackerElem = null;
                            setLink = point.link;

                            tooltext = point.tooltext || point.toolText;
                            plotX = centerX + ((yTrans * mathAbs(point.y - yMin)) *
                                mathCos(-(startAngle + (i * xTrans))));
                            plotY = centerY + ((yTrans * mathAbs(point.y - yMin)) *
                                mathSin(-(startAngle + (i * xTrans))));

                            //get the created anchor or draw
                            anchorElem = point.anchorElem;
                            //shortcuts
                            //pointAttr = point.pointAttr[point.selected ? SELECT_STATE : NORMAL_STATE];
                            //radius = pointAttr.r;
                            if (anchorElem) {
                                //update
                                radius = pluckNumber(anchorElem.attr('r'), marker.radius);
                                /** @todo need to update though animate */
                                anchorElem.attr({
                                    x: plotX,
                                    y: plotY,
                                    r: radius
                                });
                            } else {
                                marker = point.marker;
                                eventArgs = {
                                    index: i,
                                    link: setLink,
                                    value: point.y,
                                    displayValue: point.displayValue,
                                    categoryLabel: point.categoryLabel,
                                    toolText: tooltext,
                                    id: plot.userID,
                                    datasetIndex: plot.index,
                                    datasetName: plot.name,
                                    visible: plot.visible
                                };

                                if (marker && marker.enabled) {
                                    markerRadius = marker.radius;
                                    anchorShadow = marker.shadow;
                                    symbol = marker.symbol.split('_');
                                    dip = symbol[0] === 'spoke' ? 1 : 0;

                                    // Hover consmetics
                                    setRolloutAttr = setRolloverAttr = {};
                                    setRolloverProperties = point.rolloverProperties;
                                    if (marker.imageUrl) {
                                        imgRef = new win.Image();
                                        imgRef.onload = (function(x, y, marker,
                                            plotItem, eventArgs, toolText, setRollover, i) {
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

                                                plotItem.graphic = anchorElem =
                                                    paper.image(url, anchorGroup)
                                                    .attr(setRolloutAttr)
                                                    .css({
                                                        opacity: alpha * 0.01
                                                    })
                                                    .data('alwaysInvisible', scale === 0)
                                                    .data('setRolloverProperties', setRollover)
                                                    .data('setRolloverAttr', setRolloverAttr)
                                                    .data('setRolloutAttr', setRolloutAttr)
                                                    .data('anchorRadius', scale)
                                                    .data('anchorHoverRadius', hoverScale);

                                                anchorElem && datasetGraphics.push(anchorElem);

                                                if (setLink || isTooltip || setRollover) {
                                                    trackerElem = plotItem.tracker =
                                                        paper.rect(trackerLayer)
                                                        .attr(trackerAttr)
                                                        .attr({
                                                            cursor: setLink ? 'pointer' : '',
                                                            stroke: TRACKER_FILL,
                                                            'stroke-width': marker.lineWidth,
                                                            fill: TRACKER_FILL,
                                                            ishot: true,
                                                            visibility: seriesVisibility
                                                        })
                                                        .data('eventArgs', eventArgs)
                                                        .click(function(data) {
                                                            var ele = this;
                                                            plotEventHandler.call(ele,
                                                                chart, data);
                                                        })
                                                        .hover((function(plotItem) {
                                                            return function(data) {
                                                                cartesianRenderer
                                                                    .hoverPlotAnchor(this,
                                                                        data, ROLLOVER, plotItem, chart);
                                                            };
                                                        }(plotItem)), (function(plotItem) {
                                                            return function(data) {
                                                                cartesianRenderer
                                                                    .hoverPlotAnchor(this,
                                                                        data, ROLLOUT, plotItem, chart);
                                                            };
                                                        }(plotItem)))
                                                        .tooltip(toolText);
                                                }
                                                valEle = plotItem.dataLabel =
                                                    cartesianRenderer.drawPlotLineLabel.call(chart, plot,
                                                        dataOptions, i, x, y);
                                                valEle && datasetGraphics.push(valEle);
                                            };
                                        })(plotX, plotY, marker, plotItem,
                                            eventArgs, tooltext, setRolloverProperties, i);

                                        imgRef.onerror = (function(x, y, marker, plotItem,
                                            eventArgs, toolText, setRollover, i) {
                                            // Handle if image load error
                                            return function() {
                                                valEle = plotItem.dataLabel =
                                                    cartesianRenderer.drawPlotLineLabel
                                                    .call(chart, plot,
                                                        dataOptions, i, x, y);
                                                valEle && datasetGraphics.push(valEle);
                                            };
                                        })(plotX, plotY, marker, plotItem, eventArgs,
                                            tooltext, setRolloverProperties, i);
                                        imgRef.src = marker.imageUrl;
                                    } else {
                                        if (setRolloverProperties) {
                                            setRolloutAttr = {
                                                polypath: [symbol[1] || 2, plotX, plotY,
                                                    markerRadius, marker.startAngle,
                                                    dip
                                                ],
                                                fill: toRaphaelColor(marker.fillColor),
                                                'stroke-width': marker.lineWidth,
                                                stroke: toRaphaelColor(marker.lineColor)
                                            };

                                            setRolloverAttr = {
                                                polypath: [setRolloverProperties.sides || 2,
                                                    plotX, plotY,
                                                    setRolloverProperties.radius,
                                                    setRolloverProperties.startAngle,
                                                    setRolloverProperties.dip
                                                ],
                                                fill: toRaphaelColor(setRolloverProperties.fillColor),
                                                'stroke-width': setRolloverProperties.lineWidth,
                                                stroke: toRaphaelColor(setRolloverProperties.lineColor)
                                            };

                                        }

                                        anchorElem = plotItem.graphic = paper.polypath(symbol[1] || 2,
                                            plotX, plotY, markerRadius, marker.startAngle,
                                            null, anchorGroup)
                                            .attr({
                                                fill: toRaphaelColor(marker.fillColor),
                                                'stroke-width': marker.lineWidth,
                                                stroke: toRaphaelColor(marker.lineColor),
                                                'cursor': setLink ? 'pointer' : '',
                                                'stroke-linecap': 'round',
                                                'stroke-linejoin': 'round',
                                                ishot: true,
                                                'visibility': markerRadius === 0 ? 'hidden' : seriesVisibility
                                            })
                                            .data('alwaysInvisible', markerRadius === 0)
                                            .data('setRolloverProperties', setRolloverProperties)
                                            .data('setRolloverAttr', setRolloverAttr)
                                            .data('setRolloutAttr', setRolloutAttr)
                                            .data('anchorRadius', markerRadius)
                                            .data('anchorHoverRadius', setRolloverProperties &&
                                                setRolloverProperties.radius)
                                            .shadow(anchorShadow);

                                        point.anchorElem = anchorElem;
                                        //drawing tracker only if needed
                                        //get the created tracker or draw
                                        if (setLink || isTooltip || setRolloverProperties) {
                                            trackerElem = point.trackerElem;
                                            if (trackerElem) {
                                                radius = pluckNumber(trackerElem.attr('r'), (marker.radius + 1));
                                                trackerElem.attr({
                                                    x: plotX,
                                                    y: plotY,
                                                    r: radius
                                                });
                                            } else {
                                                symbol || (symbol = marker.symbol.split('_'));
                                                markerRadius = mathMax(markerRadius, trackerRadius,
                                                    setRolloverProperties && setRolloverProperties.radius || 0);
                                                trackerElem = paper.circle(plotX, plotY,
                                                    markerRadius, trackerGroup)
                                                    .attr({
                                                        cursor: point.link ? 'pointer' : '',
                                                        stroke: TRACKER_FILL,
                                                        'stroke-width': 1,
                                                        fill: TRACKER_FILL,
                                                        ishot: true,
                                                        visibility: seriesVisibility
                                                    })
                                                    .css(trackerCSS);
                                            }
                                            point.trackerElem = trackerElem;
                                        }

                                        //if tracker is not created set anchor as trcaker
                                        trackerElem = trackerElem || anchorElem;
                                        //isTooltip && trackerElem && trackerElem.tooltip(tooltext);

                                        trackerElem && trackerElem.data('eventArgs', eventArgs)
                                            .click(function(data) {
                                                var ele = this;
                                                plotEventHandler.call(ele, chart, data);
                                            })
                                            .hover((function(plotItem) {
                                                return function(data) {
                                                    cartesianRenderer.hoverPlotAnchor(
                                                        this, data, ROLLOVER, plotItem, chart);
                                                };
                                            }(plotItem)), (function(plotItem) {
                                                return function(data) {
                                                    cartesianRenderer.hoverPlotAnchor(
                                                        this, data, ROLLOUT, plotItem, chart);
                                                };
                                            }(plotItem)))
                                            .tooltip(tooltext);
                                    }
                                }
                            }


                            //populate segment path
                            segmentPath.push(plotX, plotY);

                            plotItem.dataLabel = valEle;
                            plotItem.tracker = trackerElem;

                            //draw data values
                            /** @todo difference in placing the labels appear due to */
                            //using the cartesian drawValues.
                            !(marker && marker.imageUrl) && (valEle = cartesianRenderer.drawPlotLineLabel.call(chart,
                                plot, dataOptions, i, plotX, plotY));

                            anchorElem && datasetGraphics.push(anchorElem);
                            valEle && datasetGraphics.push(valEle);
                            trackerElem && datasetGraphics.push(trackerElem);

                        }
                    });
                    segmentPath.push('Z');
                    graphPath = graphPath.concat(segmentPath);
                }

                if (graphPath && graphPath.length > 0) {
                    plotElem = plot.graphic = elements.graphic = paper.path(graphPath, radarGroup)
                        .attr({
                            stroke: toRaphaelColor(dataOptions.lineColor.FCcolor),
                            fill: toRaphaelColor(dataOptions.fillColor.FCcolor),
                            'stroke-width': dataOptions.lineWidth,
                            visibility: seriesVisibility
                        });
                }


                if (animationDuration) {
                    chart.animationCompleteQueue.push({
                        fn: function() {
                            anchorGroup.show();
                            dataLabelsLayer.attr({
                                transform: '...t' + -chartW + COMMA + -chartH
                            });
                        },
                        scope: chart
                    });
                    //animation
                    anchorGroup.hide();
                    // hide the data labels group. Will be visible after animation completes
                    dataLabelsLayer.attr({
                        transform: '...t' + chartW + COMMA + chartH
                    });
                    radarGroup.scale(0.01, 0.01, centerX, centerY)
                        .animate({
                            transform: 's1,1'
                        },
                            animationDuration, 'normal', chart.getAnimationCompleteFn());
                }
                // Remove animation complete callback function, so that
                // this will be called only once
                animationComplete = undefined;

                plotElem && datasetGraphics.push(plotElem);
                plot.visible = !isHidden;

            },

            legendClick: function(plot) {
                var cartesianRenderer = renderer['renderer.cartesian'];
                cartesianRenderer.legendClick.call(this, plot);
            },

            getEventArgs: function(plot) {
                var cartesianRenderer = renderer['renderer.cartesian'];
                return cartesianRenderer.getEventArgs.call(this, plot);
            }
        }, renderer['renderer.root']);

        renderer('renderer.multiLevelPie', {

            drawPlotMultilevelpie: function(plot, dataOptions) {
                var chart = this,
                    plotItems = plot.items,
                    plotData = plot.data,
                    options = chart.options,
                    plotOptions = options.plotOptions,
                    plotSeries = plotOptions.series,
                    layers = chart.layers,
                    plotAnimation = plotSeries.animation,
                    seriesDataLabelsStyle = plotSeries.dataLabels.style,
                    seriesShadow = plotSeries.shadow,
                    animationDuration = pluckNumber(plot.moveDuration,
                        plotAnimation.duration, 0),
                    plotBorderThickness = plotSeries.borderWidth,
                    plotBorderColor = plotSeries.borderColor,
                    paper = chart.paper,
                    tooltipOptions = options.tooltip || {},
                    isTooltip = tooltipOptions && tooltipOptions.enabled !== false,
                    toolText,
                    startAngle = (dataOptions.startAngle || 0) % pi2,
                    factor = pi2 / (dataOptions.valueTotal || 100),
                    cx = chart.canvasLeft + chart.canvasWidth * 0.5,
                    cy = chart.canvasTop + chart.canvasHeight * 0.5,
                    r,
                    r2,
                    plotItem,
                    set,
                    color,
                    val,
                    displayValue,
                    sliced,
                    setLink,
                    angle,
                    angle1,
                    angle2,
                    i,
                    smallerDimension = mathMin(chart.canvasWidth, chart.canvasHeight),
                    datalabelsLayer,
                    datasetLayer = layers.dataset,
                    primaryItemAnimating = plotAnimation.mainItem,
                    animObj = plotAnimation.animObj,
                    eventArgs,
                    plotHoverFN = function(e) {
                        var o = this;
                        plotEventHandler.call(o.graphic, chart, e, ROLLOVER);
                        plotSeries.point.events.mouseOver.call(o);
                    },
                    plotMouseOut = function(e) {
                        var o = this;
                        plotEventHandler.call(o.graphic, chart, e, ROLLOUT);
                        plotSeries.point.events.mouseOut.call(o);
                    },
                    labelHoverFN = function(e) {
                        var o = this;
                        plotEventHandler.call(o.graphic, chart, e, ROLLOVER);
                        plotSeries.point.events.mouseOver.call(o);
                    },
                    labelOutFN = function(e) {
                        var o = this;
                        plotEventHandler.call(o.graphic, chart, e, ROLLOUT);
                        plotSeries.point.events.mouseOut.call(o);
                    },
                    animStartFN = function() {
                        chart.placeDataLabels(false, plotItems, plot, dataOptions);
                    };

                r = ((/%$/.test(dataOptions.size)) ? smallerDimension * pInt(dataOptions.size) / 100 :
                    dataOptions.size) * 0.5;
                r2 = ((/%$/.test(dataOptions.innerSize)) ? smallerDimension * pInt(dataOptions.innerSize) / 100 :
                    dataOptions.innerSize) * 0.5;

                dataOptions.metrics = [cx, cy, 2 * r, 2 * r2];

                // Spare the world if no data has been sent
                if (!(plotData && plotData.length)) {
                    plotData = [];
                }

                datalabelsLayer = layers.datalabels || (layers.datalabels = paper.group('datalabels').insertAfter(
                    datasetLayer));

                angle1 = startAngle;
                angle2 = startAngle;

                i = plotData.length;
                while (i--) {
                    set = plotData[i];
                    val = set.y;
                    displayValue = set.displayValue;
                    sliced = set.sliced;
                    toolText = set.toolText;
                    setLink = !! set.link;

                    if (val === null || val === undefined) {
                        continue;
                    }

                    color = set.color;

                    angle2 = angle1;
                    angle1 -= val * factor;
                    angle = (angle1 + angle2) * 0.5;

                    if (!(plotItem = plotItems[i])) {
                        plotItem = plotItems[i] = {
                            chart: chart,
                            link: set.link,
                            value: val,
                            angle: angle,
                            color: set.color,
                            prevPointIndex: set.prevPointIndex,
                            prevSeriesIndex: set.prevSeriesIndex,
                            labelText: displayValue,
                            graphic: paper.ringpath(cx, cy, r, r2, startAngle, startAngle, datasetLayer).attr({
                                'stroke-width': set.borderWidth || plotBorderThickness,
                                'stroke': set.borderColor || plotBorderColor,
                                fill: toRaphaelColor(set.color),
                                'stroke-dasharray': set.dashStyle,
                                ishot: setLink,
                                cursor: setLink ? 'pointer' : ''
                            })
                                .shadow(seriesShadow && !! set.shadow)
                        };

                        eventArgs = {
                            link: set.link,
                            label: set.displayValue,
                            toolText: set.toolText
                        };

                        plotItem.graphic.mouseover(plotHoverFN, plotItem);

                        plotItem.graphic.mouseout(plotMouseOut, plotItem);

                        plotItem.graphic.mouseup(chart.plotMouseUp);

                        plotItem.graphic.data('plotItem', plotItem);
                        plotItem.graphic.data('eventArgs', eventArgs);
                        isTooltip && plotItem.graphic.tooltip(toolText);

                        if (displayValue !== undefined) {
                            plotItem.dataLabel = paper.text(datalabelsLayer)
                                .css(seriesDataLabelsStyle)
                                .attr({
                                    text: displayValue,
                                    fill: seriesDataLabelsStyle.color || '#000000',
                                    visibility: HIDDEN,
                                    ishot: setLink,
                                    cursor: setLink ? 'pointer' : ''
                                })
                                .mouseover(labelHoverFN, plotItem)
                                .mouseout(labelOutFN, plotItem)
                                .mouseup(chart.plotMouseUp);

                            plotItem.dataLabel.data('plotItem', plotItem);
                            plotItem.graphic.data('eventArgs', eventArgs);
                            isTooltip && plotItem.dataLabel.tooltip(toolText);
                        }
                    }


                    if (animationDuration) {
                        if (!primaryItemAnimating) {
                            animObj = plotAnimation.animObj = R.animation({
                                ringpath: [cx, cy, r, r2, angle1, angle2]
                            }, animationDuration, 'easeIn', !i && animStartFN);

                            primaryItemAnimating = plotAnimation.mainItem = plotItem.graphic.animate(animObj);
                        } else {
                            plotItem.graphic.animateWith(primaryItemAnimating, animObj, {
                                ringpath: [cx, cy, r, r2, angle1, angle2]
                            }, animationDuration, 'easeIn', !i && animStartFN);
                        }
                    }
                    else {
                        plotItem.graphic.attr({
                            ringpath: [cx, cy, r, r2, angle1, angle2]
                        });
                        !i && animStartFN && animStartFN();
                    }

                }
            },

            plotMouseUp: function(evt) {
                var o = this,
                    plotItem = o.data('plotItem');

                plotEventHandler.call(o, plotItem.chart, evt);
            }

        }, renderer['renderer.piebase']);

        // Add custom symbol to Raphael
        R.addSymbol({
            resizeIcon: function(x, y, radius) {
                var
                LINE_GAP = pluckNumber(radius, 15) / 3,
                    LINE_DIS = 3,
                    paths = [],
                    i;

                if (LINE_GAP < 0) {
                    LINE_GAP = -LINE_GAP;
                    radius = -radius;
                    x += radius - LINE_GAP / 2;
                    y += radius - LINE_GAP / 2;
                }

                for (i = 3; i > 0; i -= 1) {
                    paths.push(M, x - LINE_GAP * i, y - LINE_DIS,
                        L, x - LINE_DIS, y - LINE_GAP * i);
                }
                return paths;
            },
            closeIcon: function(x, y, r) {
                var
                icoX = x,
                    icoY = y,
                    rad = r * 1.3,
                    startAngle = 43 * deg2rad,
                    // to prevent cos and sin of start and end from becoming
                    // equal on 360 arcs
                    endAngle = 48 * deg2rad,
                    startX = icoX + rad * mathCos(startAngle),
                    startY = icoY + rad * mathSin(startAngle),
                    endX = icoX + rad * mathCos(endAngle),
                    endY = icoY + rad * mathSin(endAngle),
                    paths,
                    r1 = 0.71 * (r - 2), //(r - 2) * 0.5,
                    r2 = 0.71 * (r - 2), //(r - 2) * 0.87,

                    arcPath = getArcPath(icoX, icoY, startX, startY, endX,
                        endY, rad, rad, 0, 1);

                paths = [M, startX, startY];
                paths = paths.concat(arcPath);
                paths = paths.concat([
                    M, x + r1, y - r2,
                    L, x - r1, y + r2,
                    M, x - r1, y - r2,
                    L, x + r1, y + r2
                ]);

                return paths;
            },
            configureIcon: function(x, y, r) {
                r = r - 1;
                var k = 0.5,
                    l = 0.25,
                    r1 = r * 0.71,
                    r2 = (r + 2) * 0.71,
                    x1 = x - r,
                    y1 = y - r,
                    x2 = x + r,
                    y2 = y + r,
                    x3 = x + k,
                    y3 = y + k,
                    x4 = x - k,
                    y4 = y - k,

                    x5 = x1 - 2,
                    y5 = y1 - 2,
                    x6 = x2 + 2,
                    y6 = y2 + 2,
                    x7 = x + r1,
                    y7 = y + r1,
                    x8 = x - r1,
                    y8 = y - r1,
                    x9 = x + r2,
                    y9 = y + r2,
                    x10 = x - r2,
                    y10 = y - r2,
                    paths;

                paths = [M, x1, y3, L, x5, y3, x5, y4, x1, y4,
                    x8 - l, y8 + l, x10 - l, y10 + l, x10 + l, y10 - l, x8 + l, y8 - l,
                    x4, y1, x4, y5, x3, y5, x3, y1,
                    x7 - l, y8 - l, x9 - l, y10 - l, x9 + l, y10 + l, x7 + l, y8 + l,
                    x2, y4, x6, y4, x6, y3, x2, y3,
                    x7 + l, y7 - l, x9 + l, y9 - l, x9 - l, y9 + l, x7 - l, y7 + l,
                    x3, y2, x3, y6, x4, y6, x4, y2,
                    x8 + l, y7 + l, x10 + l, y9 + l, x10 - l, y9 - l, x8 - l, y7 - l, Z
                ];
                return paths;
            },
            axisIcon: function(x, y, r) {
                r = r - 1;
                var r1 = r * 0.33,
                    r2 = r / 2,
                    x1 = x - r,
                    y1 = y - r,
                    x2 = x + r2,
                    y2 = y + r,
                    x3 = x - r2,
                    y3 = y + r1,
                    y4 = y - r1,
                    paths;

                paths = [M, x1, y1, L, x2, y1, x2, y2, x1, y2, M, x3, y3, L, x2, y3,
                    M, x3, y4, L, x2, y4
                ];
                return paths;
            },
            loggerIcon: function(x, y, r) {
                r = r - 1;
                x = x - r;
                y = y - r;
                var r2 = r * 2,
                    x1 = x + r2,
                    x2 = x + 2,
                    x3 = x1 - 2,
                    y1 = y + 2,
                    y2 = y1 + r,
                    y3 = y2 + 2,
                    paths;

                paths = [M, x, y, L, x1, y, x1, y1, x3, y1, x3, y2, x1, y2, x1, y3,
                    x, y3, x, y2, x2, y2, x2, y1, x, y1, x, y
                ];
                return paths;
            }
        });

    },
    [3, 2, 1, 'release']
]);
