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
/**
 * @constructor
 * @param {Map} map  地图实例
 * @param {object} option 图层选项，如:{url}
 */
function MapLayer( map, option ){
	var layer = document.createElement("div");
	layer.className = "mlayer"
	map.layerroot.appendChild( layer );
	this.root = layer;
	this.option = option || {};
	this.tiles = [];
}

/**
 * @method loadTile
 * @param {Tile} tile 单格块
 */
MapLayer.prototype.loadTile = function( tile ){
	this.tiles.push( tile );

	if( this.option.url ){
		tile.url = this.option.url;
	}
	
	var source = tile.getSource();
	source.querySelector(".tip").innerHTML = tile.lonlat || '';
	source.title = [tile.x,tile.y,tile.z].join('_');
	source.className = 'tile'
	source.style.cssText = 'left:' + (tile.xpos) + 'px;top:' + (tile.ypos) + 'px'
	this.root.appendChild( source );
}
/**
 * 清空图层底图
 */
MapLayer.prototype.clear = function(){
	for(var i=0;i<this.tiles.length;i++){
		this.tiles[i].destroy();
	}
	this.tiles = [];
	this.root.innerHTML = '';
}

/**
 * 销毁
 */

MapLayer.prototype.destroy = function(){
	if( this.root ){
		this.clear();
		try{
			this.root.parentNode.removeChild( this.root );
		}catch(e){}
	}	
	this.root = null;
}
function Map( dom ){
	this.root = typeof dom =='string'?document.getElementById( dom ):dom;
	this.root.innerHTML = [
		'<div class="layers" id="layers"></div>',
		'<div class="layermask" id="layermask"></div>',
	].join('')
	this.layerroot = document.getElementById('layers');
	this.layermask = document.getElementById('layermask');
	this.viewWidth = this.root.offsetWidth;
	this.viewHeight = this.root.offsetHeight;
	this.maxLevel = 16;
	this.tileSize = 256;
	this.mapLayers = {};
	this.initialize();
}
Map.prototype.initialize = function(){
	var earth_width = Mercator.EARTH_HALF_C;
	this.resolutions = [];
	for(var i=0;i<=this.maxLevel;i++){
		//单位像素的meter值
		this.resolutions[i] = earth_width * 2 / this.tileSize / ( Math.pow(2, i ));
	}
	this.mapLayers["default"] = new MapLayer( this );
}
Map.prototype.getLayer = function(){
	return this.mapLayers['default'];
}
Map.prototype.setLayer = function( option ){
	try{
		this.mapLayers['default'].destroy();
	}catch(e){}
	var layer = new MapLayer( this, option );
	this.mapLayers['default'] = layer;
	this._draw();
}


var LonLat = function(){
	if( arguments.length == 2){
		this.lon = arguments[0];
		this.lat = arguments[1];
	}else{
		if( typeof arguments[0] == 'object'){
			this.lon = arguments[0].lon;
			this.lat = arguments[0].lat;
		}
	}
	//console.log("原始经纬度", this.lon,this.lat )
	var trans = GpsCorrect.transform( this.lon, this.lat );
	this.lat = trans.lat;
	this.lon = trans.lon;
	//console.log("新始经纬度", this.lon,this.lat )
	return;
	if( !this.x ){
		var p = Mercator.toPixed( this.lon,this.lat );
		this.x = p.x;
		this.y = p.y;		
	}

}

/**
 * @method centerAndZoom
 * @param {LonLat} center - 地图点对象
 * @param {number} zoom - 缩放级别
 */
Map.prototype.centerAndZoom = function( center, zoom ){
	this._center = center;
	this._zoom = zoom || 12;
	
	this._debugPt();
	this._draw();
}

Map.prototype._debugPt = function(){
	return;
	console.log("初始经纬度:", this._center.lon, this._center.lat, this._zoom)
	
	console.log( Mercator.toPixed( -180,-85.05112877980659),Mercator.toPixed(180,85.05112877980659))
	console.log( Mercator.toLonLat( -Mercator.EARTH_HALF_C,-Mercator.EARTH_HALF_C),Mercator.toLonLat(Mercator.EARTH_HALF_C,Mercator.EARTH_HALF_C))
	console.log("TileXY个数范围范围", this.TileLonLat2XY(-180,-85.05112877980659),this.TileLonLat2XY(180,85.05112877980659)  )
	console.log("TileXY的经纬度范围", this.TileXY2LonLat(0,0),this.TileXY2LonLat(Math.pow(2,this._zoom),Math.pow(2,this._zoom)))
	console.log("Tile坐标")
	var xy = this.TileLonLat2XY( this._center.lon, this._center.lat );
	console.log("xy", xy)
	console.log(this.TileXY2LonLat(xy.x,xy.y))
	console.log("像素坐标")
	xy = Mercator.toPixed( this._center.lon, this._center.lat );
	console.log("xy", xy)
	console.log(Mercator.toLonLat(xy.x,xy.y))

	return;
}

Map.prototype.panTo = function( offsetx, offsety ){
	var pt = this.TileLonLat2XY( this._center.lon, this._center.lat );
	var pixelLonLat = this.PixelLonLat( Math.floor(pt.x), Math.floor(pt.y));
	this._center.lon += offsetx * pixelLonLat.lon / this.tileSize;
	this._center.lat += offsety * pixelLonLat.lat / this.tileSize;	
	this._center = new LonLat( this._center.lon, this._center.lat );
	console.log("newCenter:", this._center)
	this._draw();
}

Map.prototype.zoomIn = function( pt, offsetLevel ){
	offsetLevel = offsetLevel || 1;
	
	var centerX = this.viewWidth / 2;
	var centerY = this.viewHeight / 2;
	var scale = Math.pow(2, offsetLevel);
	if( !pt ){
		pt = {x:centerX,y:centerY}
	}
	var x = ( pt.x - centerX ) * (1 - scale );
	var y = ( pt.y - centerY ) * (1 - scale );
	if( this._zoom >= this.maxLevel ){
		this._zoom = this.maxLevel;	
	}else{
		this._zoom += offsetLevel;
		this.layerroot.style.cssText = 'transform:scale('+scale+');left:'+ x +'px;top:'+y+'px';
		this.panTo( (pt.x - centerX) * scale - (pt.x - centerX) , (pt.y - centerY)* scale -  (pt.y - centerY) )
	}
	console.log("scale====", scale, "zoom", this._zoom)
	

}

Map.prototype.zoomOut = function( pt, offsetLevel ){
	offsetLevel = offsetLevel || 1;
	var centerX = this.viewWidth / 2;
	var centerY = this.viewHeight / 2;
	var scale = Math.pow(2, -offsetLevel);
	if( !pt ){
		pt = {x:centerX,y:centerY}
	}
	var x = ( pt.x - centerX ) * (1 - scale );
	var y = ( pt.y - centerY ) * (1 - scale );
	//this.layerroot.style.cssText = 'transform:translate('+x+'px,'+y+'px) scale(2)';
	if( this._zoom <= 0 ){
		this._zoom = 0;	
	}else{
		this._zoom -= offsetLevel;
		this.layerroot.style.cssText = 'transform:scale('+scale+');left:'+ x +'px;top:'+y+'px';
		this.panTo( (pt.x - centerX) * scale - (pt.x - centerX) , (pt.y - centerY)* scale -  (pt.y - centerY) )
	}
}
Map.prototype.TileLonLat2XY = function( lon, lat ){
	var z = this._zoom;
	var x = (lon+180)/360*Math.pow(2,z);
	var y = (1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,z);
	return {x:x,y:y}
}

Map.prototype.TileXY2LonLat = function( x, y ){
	var z = this._zoom;
    var lon = (x/Math.pow(2,z)*360-180);
    var n = Math.PI-2*Math.PI*y/Math.pow(2,z);
  	lat = (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
    return {lon:lon,lat:lat}
}
/*
 * 通过中心经纬度位置 计算单位像素的经纬度差
 * @param {number} tileX - 当前中心经纬度图片的x下标
 * @param {number} tileY - 当前中心经纬度图片的y下标
 * @return {lon,lat}
 */
Map.prototype.PixelLonLat = function( tileX, tileY ){
	tileX = tileX || 0;
	tileY = tileY || 0;
	var t1 = this.TileXY2LonLat(tileX,tileY);
	var t2 = this.TileXY2LonLat(tileX+1,tileY+1);
	return {lon:t2.lon-t1.lon,lat:t2.lat-t1.lat}
}
/*
Map.prototype.LonLat2XY = function( lon, lat ){
    var x = (lon+180)*(256<<this._zoom)/360;
    var siny = Math.sin(lat*Math.PI/180);
	var y = Math.log((1+siny)/(1-siny))
	y = (128<<this._zoom)*(1-y/(2*Math.PI));
	return {x:x,y:y}
}
Map.prototype.XY2LonLat = function( x, y ){
	var PI = Math.PI;
	var zoomN = Math.pow(2, this._zoom);
	var lon = x/zoomN*360.0-180.0;
	var a = PI*(1-2*y/zoomN);
	var e = Math.E;
	var rad = (Math.pow(e,a)-Math.pow(e,-a))*0.5
	var latrad = Math.atan(rad);
	var lat = latrad*180.0/PI;
	return {"lat":lat,"lon":lon};
}
*/

Map.prototype._draw = function(){
	this.clear();
	this.layerroot.style.cssText = '';
	var maxX = Math.ceil(this.viewWidth / this.tileSize/2);
	var maxY = Math.ceil(this.viewHeight / this.tileSize/2);

	var pt = this.TileLonLat2XY( this._center.lon, this._center.lat );
	var lonlat = this.TileXY2LonLat( pt.x, pt.y);

	var x = pt.x, y = pt.y;
	var startX = Math.floor(x-maxX)
	var startY = Math.floor(y-maxY)


	var offsetX = pt.x - Math.floor(pt.x)// + (this.viewWidth - this.tileSize)/2;
	var offsetY = pt.y - Math.floor(pt.y)// + (this.viewHeight - this.tileSize)/2;	
	var lonlat = this.TileXY2LonLat( Math.floor(pt.x), Math.floor(pt.y));
	var pixelLonLat = this.PixelLonLat( Math.floor(pt.x), Math.floor(pt.y));
	offsetX = offsetY = 0;
	offsetX = ( this._center.lon - lonlat.lon )*(1/ pixelLonLat.lon *256) - 200;
	offsetY = ( this._center.lat - lonlat.lat )*(1/ pixelLonLat.lat *256) - 200;
	for(var i= startX;i< x + maxX; i++){
		for(var j= startY;j< y + maxY; j++){
			//console.log('startx',i, 'starty',j, Math.pow(2, this._zoom))			
			var ll = this.TileXY2LonLat(i,j);
			var tile = new Tile({
				x:i,y:j,z:this._zoom, 
				lonlat: [
					//this._center.lon + step * one.lon,
					//this._center.lat + step * one.lat
					ll.lon,ll.lat
				].join(','),
				xpos:(i-startX - maxX) * 256 - offsetX, 
				ypos:(j-startY - maxY) * 256 - offsetY
			});
			this.loadTile( tile );
		}
	}
	console.log("tile水平个数:", Math.pow(2,this._zoom));
	console.log("center:",this._center, this._zoom)
}

Map.prototype.getCursorLonLat = function( pt ){
	console.log("mapX,", pt)
	var offsetX = pt.x - this.viewWidth/2;
	var offsetY = pt.y - this.viewHeight/2;
	console.log('offsetX', offsetX)
	var p = 360 / Math.pow(2, this._zoom) / 256;
	offsetX *= p;
	offsetY *= p;
	var lon = this._center.lon + offsetX;
	var lat = this._center.lat + offsetY;
	console.log("lon", lon, "lat", lat,)
}

Map.prototype.clear = function(){
	try{
		this.getLayer().clear();
	}catch(e){}
	
}

Map.prototype.loadTile = function( tile ){
	this.getLayer().loadTile( tile );
}

/**
 * @param {Object} opt 参数，如{url}
 */
function Tile( opt ){
	this.option = opt;
	
	for(var i in opt){
		this[i] = opt[i];
	}
	this.url = opt.url;
	this._loading = false;
}
Tile.prototype.destroy = function(){
	if( this._source ){
		this._source.onerror = this._source.onload = function(){}
		if( this._loading ){
			try{
				this._source.abort();
			}catch(e){}
			this._loading = false;
		}
		try{
			this._source.parentNode.removeChild( this._source );
		}catch(e){}
		this._source = null;
	}
}
Tile.prototype.getSource = function( ){
	if( !this._source ){
		this.root = document.createElement('div')
		this._source = document.createElement('img');
		this.root.appendChild( this._source );
		this.tip = document.createElement('div');
		this.tip.className = 'tip'
		this.root.appendChild(this.tip);
	}
	if( !this._loading ){
		this._loading = true;
		this._source.onerror = this._source.onload = function(){
			this._loading = false;
		}
		//this._source.src = 'about:blank';
		this._source.src = this.getTileUrl( this.option );
	}
	return this.root;
}
Tile.prototype.getTileUrl = function( obj ){	
	if( this.url ){
		return this.url.replace(/{x}/ig, obj.x).replace(/{y}/ig, obj.y).replace(/{z}/ig, obj.z);
	}
	return 'http://mt2.google.cn/vt/lyrs=m@167000000&hl=zh-CN&gl=cn&x='+obj.x+'&y='+obj.y+'&z='+obj.z+'&s=Galil'
}