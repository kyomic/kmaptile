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

 var PI = Math.PI;
/*
WGS84：为一种大地坐标系，也是目前广泛使用的GPS全球卫星定位系统使用的坐标系。
GCJ02：又称火星坐标系，是由中国国家测绘局制订的地理信息系统的坐标系统。由WGS84坐标系经加密后的坐标系。
BD09：为百度坐标系，在GCJ02坐标系基础上再次加密。其中bd09ll表示百度经纬度坐标，bd09mc表示百度墨卡托米制坐标。
使用OpenStreetMap的坐标为WGS84；使用高德地图、腾讯地图的坐标为GCJ02；使用百度地图的坐标为BD09；谷歌地图和Bing地图的中国部分采用了高德地图的数据，所以坐标为GCJ02


谷歌XYZ：Z表示缩放层级，Z=zoom；XY的原点在左上角，X从左向右，Y从上向下。
TMS：开源产品的标准，Z的定义与谷歌相同；XY的原点在左下角，X从左向右，Y从下向上。
QuadTree：微软Bing地图使用的编码规范，Z的定义与谷歌相同，同一层级的瓦片不用XY两个维度表示，而只用一个整数表示，该整数服从四叉树编码规则
百度XYZ：Z从1开始，在最高级就把地图分为四块瓦片；XY的原点在经度为0纬度位0的位置，X从左向右，Y从下向上。
*/
var Mercator = function(){}
Mercator.toPixed = function( lon,lat  ){
	var x = lon * Mercator.EARTH_HALF_C /180;
	var y= Math.log(Math.tan((90+lat)*PI/360))/(PI/180);
    y = y * Mercator.EARTH_HALF_C/180;
    return {x:x,y:y}
}
//[-180, 180], 纬度为[-85.05112877980659，85.05112877980659

Mercator.toLonLat = function( x, y ){
    var lon = x / Mercator.EARTH_HALF_C * 180;
    var lat = y / Mercator.EARTH_HALF_C * 180;
    lat = 180/PI*(2*Math.atan(Math.exp(lat*PI/180)) - PI/2);
    return {
    	lon:lon,lat:lat
    }
}
//@see:https://www.cnblogs.com/viewcozy/p/4773893.html
Mercator.GetQuadtreeAddress = function( lon, lat ){
    var PI = 3.1415926535897;
    var digits = 18; // how many digits precision
    // now convert to normalized square coordinates
    // use standard equations to map into mercator projection
    var x = (180.0 + parseFloat(lon)) / 360.0;
    var y = -parseFloat(lat) * PI / 180; // convert to radians
    y = 0.5 * Math.log((1+Math.sin(y)) / (1 - Math.sin(y)));
    y *= 1.0/(2 * PI); // scale factor from radians to normalized
    y += 0.5; // and make y range from 0 - 1
    var quad = "t"; // google addresses start with t
    var lookup = "qrts"; // tl tr bl br
    while (digits--) // (post-decrement)
    {
        // make sure we only look at fractional part
        x -= Math.floor(x);
        y -= Math.floor(y);
        quad = quad + lookup.substr((x >= 0.5 ? 1 : 0) + (y >= 0.5 ? 2 : 0), 1);
        // now descend into that square
        x *= 2;
        y *= 2;
    }
    return quad;
}
Mercator.GCJ02_BD09  = function( lon, lat ){
    var x_pi = x_pi = 3.14159265358979324 * 3000.0 / 180.0;
    var x = lon
    var y = lat
    var z = math.sqrt(x * x + y * y) + 0.00002 * math.sin(y * x_pi)
    var theta = math.atan2(y, x) + 0.000003 * math.cos(x * x_pi)
    var bmap_lon = z * math.cos(theta) + 0.0065
    var bmap_lat = z * math.sin(theta) + 0.006
    return {lon:bmap_lon,lat:bmap_lat};
}

Mercator.BD09_GCJ02  = function( lon, lat ){
    var x = lon - 0.0065
    var y = lat - 0.006;
    var z = math.sqrt(x * x + y * y) - 0.00002 * math.sin(y * x_pi);
    var theta = math.atan2(y, x) - 0.000003 * math.cos(x * x_pi);
    var amap_lon = z * math.cos(theta);
    var amap_lat = z * math.sin(theta);
    return {lon:amap_lon,lat:amap_lat};
}
//地球半周长
Mercator.EARTH_HALF_C = 20037508.34;


/** 
* gps纠偏算法，适用于google,高德体系的地图 
* @author Administrator 
* @see https://wenku.baidu.com/view/29b5d50654270722192e453610661ed9ad515590.html
*/
var GpsCorrect = function(){}
GpsCorrect.outOfChina = function( lon, lat ){
    return true;
    if( lon < 72.004 || lon > 137.8347 ){
        return true;
    }
    if( lat < 0.8293 || lat > 55.8271 ){
        return true;
    }
    return false;
}

GpsCorrect.transformLat = function(x, y ){
    var ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));  
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;  
    ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;  
    ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;  
    return ret;  
}

GpsCorrect.transformLon = function( x, y ){
    var ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));  
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;  
    ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;  
    ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;  
    return ret;  
}
GpsCorrect.transform = function( lon, lat ){
    var pi = 3.14159265358979324;  
    var a = 6378245.0;  
    var ee = 0.00669342162296594323; 
    if( GpsCorrect.outOfChina( lon, lat )){
        return {
            lon:parseFloat( lon ),lat:parseFloat( lat )
        }
    }else{
        var dLat = GpsCorrect.transformLat(lon - 105.0, lat - 35.0);  
        var dLon = GpsCorrect.transformLon(lon - 105.0, lat - 35.0);  
        var radLat = lat / 180.0 * pi;  
        var magic = Math.sin(radLat);  
        magic = 1 - ee * magic * magic;  
        var sqrtMagic = Math.sqrt(magic);  
        dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * pi);  
        dLon = (dLon * 180.0) / (a / sqrtMagic * Math.cos(radLat) * pi);  
        return {
            lat:lat + dLat,
            lon:lon + dLon
        } 
    }
}
