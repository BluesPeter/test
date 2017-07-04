/**
 * @author pengge
 * @date 2017-07-03
 * @overview 在浏览器中打开native App;
 *
 */

(function(root, factory){
    if (typeof define === 'function' && define.amd) {
        // AMD
        define([], factory);
    } else if (typeof exports === 'object') {
        // Node, CommonJS-like
        module.exports = factory();
    } else {
        root.nativeSchema = factory();
    }
}(this, function(){

    var AppConfig = {};

    return {
 		// UA鉴定
        isAndroid: function() {
            return navigator.userAgent.match(/Android/i) ? true : false;
        },
        isMobileQQ : function(){
            var ua = navigator.userAgent;
            return /(iPad|iPhone|iPod).*? (IPad)?QQ\/([\d\.]+)/.test(ua) || /\bV1_AND_SQI?_([\d\.]+)(.*? QQ\/([\d\.]+))?/.test(ua);
        },
        isIOS: function() {
            return navigator.userAgent.match(/iPhone|iPad|iPod/i) ? true : false;
        },
        isWx : function() {
            return navigator.userAgent.match(/micromessenger/i) ? true : false;
        },
        // 是否为Android下的chrome浏览器，排除mobileQQ；
	    // Android下的chrome，需要通过特殊的intent 来唤醒
	    // refer link：https://developer.chrome.com/multidevice/android/intents
        isAndroidChrome:function(){
        	return ((navigator.userAgent.match(/Chrome\/([\d.]+)/) || navigator.userAgent.match(/CriOS\/([\d.]+)/))&& this.isAndroid() && !this.isMobileQQ())? true : false;
        },
        getUrlString:function(){
        	var reg = new RegExp("(^|&)"+ name +"=([^&]*)(&|$)");
		    var r =decodeURIComponent(window.location.search).substr(1).match(reg);
		    if(r!=null)return  unescape(r[2]); return null;
        },

        /**
         * [mixinConfig 重新收拢配置]
         * @param  {[type]} config [description]
         * @return {[type]}        [description]
         */
        mixinConfig: function(config){
            if (!config) {
                return;
            }
            AppConfig.PROTOCAL = config.protocal;
            AppConfig.schema   = config.schema;
            AppConfig.LOAD_WAITING = config.loadWaiting ;
            AppConfig.FAILBACK = config.failUrl;

        },
        /**
         * [generateSchema 根据不同的场景及UA生成最终应用的schema]
         * @return {[type]}                [description]
         */
        generateSchema: function(config,schema) {

            var localUrl  = window.location.href;
            var schemaStr = schema;

            // 如果是安卓chrome浏览器，则通过intent方式打开
            if (this.isAndroidChrome()) {
                schemaStr =  "intent://" + schemaStr +"#Intent;"  +
                             "scheme="   + config.protocal          + ";"+
                             "package="  + config.apkInfo.PKG      + ";"+
                             "category=" + config.apkInfo.CATEGORY + ";"+
                             "action="   + config.apkInfo.ACTION   + ";"+
                             "S.browser_fallback_url=" + encodeURIComponent(config.failUrl) + ";" +
                             "end";
            } else {
                schemaStr = AppConfig.PROTOCAL + "://" + schemaStr;
            }

            return schemaStr;
        },

        /**
         * [loadSchema 唤醒native App，如果无法唤醒，则跳转到下载页]
         * @return {[type]} [description]
         */
        loadSchema: function(config){

            this.mixinConfig(config);

            var schemaUrl = this.generateSchema(config,AppConfig.schema);
            //var schemaUrl = "dianping://home";

            var iframe    = document.createElement("iframe"),
                aLink     = document.createElement("a"),
                body      = document.body,
                loadTimer = null;

            // 隐藏iframe及a
            aLink.style.cssText = iframe.style.cssText = "display:none;width:0px;height:0px;";

            if (this.isIOS()) {
                aLink.href = schemaUrl;
                body.appendChild(aLink);
                aLink.click();
                
            // Android chrome 不支持iframe 方式唤醒
            // 适用：chrome,leibao,mibrowser,opera,360
            } else if (this.isAndroidChrome()) {

                aLink.href = schemaUrl;
                body.appendChild(aLink);
                aLink.click();

            // 其他浏览器
            // 适用：UC,sogou,firefox,mobileQQ
            } else {

                body.appendChild(iframe);
                iframe.src = schemaUrl;

            }

            // 如果LOAD_WAITING时间后,还是无法唤醒app，则直接打开下载页
            // opera 无效
            var start = Date.now(),
                that  = this;
            loadTimer = setTimeout(function() {

                if (document.hidden || document.webkitHidden) {
                    return;
                }

                // 如果app启动，浏览器最小化进入后台，则计时器存在推迟或者变慢的问题
                // 那么代码执行到此处时，时间间隔必然大于设置的定时时间
                if (Date.now() - start > AppConfig.LOAD_WAITING + 200) {
                    // come back from app

                    // 如果浏览器未因为app启动进入后台，则定时器会准时执行，故应该跳转到下载页
                } else {
                    window.location.href = AppConfig.FAILBACK;
                }

            }, AppConfig.LOAD_WAITING);


            // 当本地app被唤起，则页面会隐藏掉，就会触发pagehide与visibilitychange事件
            // 在部分浏览器中可行，网上提供方案，作hack处理
            var visibilitychange = function() {
                var tag = document.hidden || document.webkitHidden;
                tag && clearTimeout(loadTimer);
            };
            document.addEventListener('visibilitychange', visibilitychange, false);
            document.addEventListener('webkitvisibilitychange', visibilitychange, false);
            // pagehide 必须绑定到window
            window.addEventListener('pagehide', function() {
                clearTimeout(loadTimer);
            }, false);
        }
    };
}));