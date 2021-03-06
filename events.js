/*
 * Copyright (C) 2020 shareme.cn. All Rights Reserved.
 *
 * @author kyomic <kyomic@163.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var utils = {};
/**
 * 对字符串进行哈希计算
 * @name utils.stringhash
 * @function
 * @param {String} str 目标字符串
 * @param {Integer} len 产生哈希字符串长度 默认: 32
 * @returns {String} 哈希后的字符串
 */
utils.stringhash = function( str, len ){
    /* 对两个字符串进行异或运算
     */
    var stringxor = function( s1, s2 ) {
        var s = '', hash = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', max = Math.max( s1.length, s2.length );
        for ( var i = 0; i < max; i++ ) {
            // 将两个字符串对应字符的 Unicode 编码进行异或运算
            // 把运算结果取模, 去字符表中取对应字符
            var k = s1.charCodeAt( i ) ^ s2.charCodeAt( i );
            s += hash.charAt( k % 52 );
        }
        return s;
    };
    len = len || 32;
    var start = 0, i = 0, result = '', filllen = len - str.length % len;
    //使用字符0,将字符串长度补齐为哈希长度的倍数
    for ( i = 0; i < filllen; i++ ) {
        str += "0";
    }
    //将字符串分成 (str/len) 份,将上一次哈希后的字符串与下一组字符串进行哈希
    while ( start < str.length ) {
        result = stringxor( result, str.substr( start, len ) );
        start += len;
    }
    return result;

}
utils.offset = function( el ){
  var x = 0,y = 0;
  while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop )){
    x += el.offsetLeft - el.scrollLeft;
    y += el.offsetTop - el.scrollTop;
    el = el.offsetParent;
  }
  return {top:y, left:x};
}
/**
 * 判断dom是否在父dom中
 * @param {DOM} parent - 父dom
 * @param {DOM} child - 子dom
 */
utils.containDom = function( parent, child ){
    if( child == parent ){
        return true;
    }
    let p = child.parentNode;
    while(p){
        if( p == parent ){
            return true;
        }
        p = p.parentNode;
    }
    return false;
}
/**
 * 简单的事件代理
 * @param {DOM} target - 被代理的DOM
 * @param {string} evt - 事件类型
 * @param {string} selector - css选择器
 * @param {function} handler - 事件回调函数
 */
utils.delegate = function( target, evt, selector, handler ){
    let id = utils.stringhash( target.nodeName + target.id + evt + selector );
    if( !target.__evtMap ){
        target.__evtMap = {};
    }
    target.__evtMap[ id ] = function( e ){
        let tar = e.target;
        let parent = null;
        try{
          parent = target.querySelector( selector );
        }catch(e){
          parent = document.querySelector( selector );
        }
        if( utils.containDom(parent, tar)){
            if( handler.call(tar, e) === false ){
                e.stopPropagation();
                try{
                    e.cancelBubble = true;
                }catch(e){}
            }
        }
    }
    target.addEventListener(evt, target.__evtMap[ id ]);
}

utils.undelegate = function( target, evt, selector ){
    let id = utils.stringhash( target.nodeName + target.id + evt + selector );
    if( target.__evtMap ){
       let handler = target.__evtMap[ id ];
       if( handler ){
           target.removeEventListener(evt, handler );
       }
    }
}


var mapdom = document.getElementById("map");


//pan

(function(){
  var startX = 0;
  var startY = 0;
  var offsetX = 0;
  var offsetY = 0;
  var draging = false;
  var onDrag = function(e){
    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;
    draging = true;
    var layers = mapdom.querySelector(".layers");
    layers.style.cssText = 'left:' + offsetX + 'px;top:' + offsetY + 'px'
  }
  var onDragEnd = function(e){
    offsetX = startX - e.clientX;
    offsetY = startY - e.clientY;
    if( draging ){
      map.panTo( offsetX, offsetY )      
    }
    draging = false;
    
    document.removeEventListener('mousemove', onDrag )
    document.removeEventListener('mouseup', onDragEnd )
    document.removeEventListener('mouseleave', onDragEnd )
  }
  utils.delegate( mapdom, 'mousedown', '.layermask',function(e){
    startX = e.clientX;
    startY = e.clientY;
    document.addEventListener('mousemove', onDrag )
    document.addEventListener('mouseup', onDragEnd )
    document.addEventListener('mouseleave', onDragEnd )

  })
  utils.delegate( mapdom, 'mouseleave', '.layermask',function(e){
    onDragEnd(e)
  })
})();

//zoom
(function(){
  utils.delegate( mapdom, 'mousewheel', '.layermask',function(e){
    console.log('wheel',e)
    var clientX = e.clientX;
    var clientY = e.clientY;
    var pt = {x:clientX,y:clientY};
    //pt = null;
    if( e.wheelDelta > 0){
      map.zoomIn(pt);
    }else{
      map.zoomOut(pt);
    }
  })
  utils.delegate( mapdom, 'mousemove', '.layermask',function(e){
    var offset = utils.offset( mapdom );
    var clientX = e.clientX - offset.left;
    var clientY = e.clientY - offset.top;
    var pt = {x:clientX,y:clientY};
    //map.getCursorLonLat( pt );
  });
})();