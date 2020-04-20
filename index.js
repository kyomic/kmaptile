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
}

/**
 * @method loadTile
 * @param {Tile} tile 单格块
 */
MapLayer.prototype.loadTile = function( tile ){
	if( this.option.url ){
		tile.url = this.option.url;
	}
	var source = tile.getSource();
	source.title = [tile.x,tile.y,tile.z].join('_');
	source.className = 'tile'
	source.style.cssText = 'left:' + (tile.xpos) + 'px;top:' + (tile.ypos) + 'px'
	this.root.appendChild( source );
}
/**
 * 清空图层底图
 */
MapLayer.prototype.clear = function(){
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

	/**
	 * 不同级别不同的分辨率
	 */
}
Map.prototype.initialize = function(){
	var earth_width = Mercator.EARTH_HALF_C;
	this.resolutions = [];
	for(var i=0;i<=this.maxLevel;i++){
		this.resolutions[i] = earth_width * 2 / this.tileSize / ( Math.pow(2, i ));
	}
	this.mapLayers["default"] = new MapLayer( this );
	console.log("分辨率",this.resolutions)
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
	console.log("初始经纬度:", this._center.lon, this._center.lat, this._zoom)
	
	console.log( Mercator.toPixed( -180,-85.05112877980659),Mercator.toPixed(180,85.05112877980659))
	console.log( Mercator.toLonLat( -Mercator.EARTH_HALF_C,-Mercator.EARTH_HALF_C),Mercator.toLonLat(Mercator.EARTH_HALF_C,Mercator.EARTH_HALF_C))
	
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
	var pt = Mercator.toPixed( this._center.lon, this._center.lat );	
	pt.x += offsetx * this.resolutions[this._zoom];
	pt.y += offsety * this.resolutions[this._zoom];	
	pt = Mercator.toLonLat( pt.x, pt.y );
	this._center = new LonLat( pt.lon, pt.lat );
	console.log("newCenter:", this._center)
	this._draw();
}

Map.prototype.zoomIn = function( pt, offsetLevel ){
	offsetLevel = offsetLevel || 1;
	var centerX = this.viewWidth / 2;
	var centerY = this.viewHeight / 2;
	var zoom = Math.pow(2,offsetLevel);
	if( typeof pt == 'undefined' ){
		pt = {x:centerX,y:centerY}
	}
	var x = (centerX - pt.x)* zoom/2;
	var y = (centerY - pt.y)* zoom/2;
	//this.layerroot.style.cssText = 'transform:translate('+x+'px,'+y+'px) scale(2)';
	this.layerroot.style.cssText = 'transform:scale('+zoom+');left:'+ x +'px;top:'+y+'px';
	this._zoom += 1;
	if( this._zoom >= this.maxLevel ){
		this._zoom = this.maxLevel;
		this.panTo( x, y )
		return;
	}
	this.panTo( x, y )

}

Map.prototype.zoomOut = function( pt, offsetLevel ){
	offsetLevel = offsetLevel || 2;
	var centerX = this.viewWidth / 2;
	var centerY = this.viewHeight / 2;
	var zoom = 1/ offsetLevel;
	if( typeof pt == 'undefined'){
		pt = {x:centerX,y:centerY}
	}
	var x = -(centerX - pt.x) * zoom;
	var y = -(centerY - pt.y) * zoom;
	//this.layerroot.style.cssText = 'transform:translate('+x+'px,'+y+'px) scale(2)';
	this.layerroot.style.cssText = 'transform:scale('+zoom+');left:'+ x +'px;top:'+y+'px';
	this._zoom -= 1;
	if( this._zoom <= 0 ){
		this._zoom = 0;
		this.panTo( x, y )
		return;
	}
	this.panTo( x, y )
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
    var n=Math.PI-2*Math.PI*y/Math.pow(2,z);
  	lat = (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
    return {lon:lon,lat:lat}
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
	var globalPt = Mercator.toPixed( this._center.lon, this._center.lat );
	var x = pt.x, y = pt.y;
	var startX = Math.floor(x-maxX)
	var startY = Math.floor(y-maxY)

	var offsetX = Math.random()*100;
	console.log("tileX===", pt.x, pt.y, 'globalPt', globalPt)
	for(var i= startX;i< x + maxX; i++){
		for(var j= startY;j< y + maxY; j++){
			//console.log('startx',i, 'starty',j, Math.pow(2, this._zoom))
			//console.log('startX===', i - startX - Math.floor(maxX))
			var tile = new Tile({
				x:i,y:j,z:this._zoom, 
				xpos:(i-startX - maxX) * 256 + pt.x % 256, 
				ypos:(j-startY - maxY) * 256 + 128
			});
			this.loadTile( tile );
		}
	}
	console.log("tile水平个数:", Math.pow(2,this._zoom));
	console.log("center:",this._center, this._zoom)
}

Map.prototype.clear = function(){
	try{
		this.getLayer().clear();
	}catch(e){}
	
}

Map.prototype.loadTile = function( tile ){
	this.getLayer().loadTile( tile );
}
/*
Map.prototype._draw2 = function(){
	var resolution = this.resolutions[ this._zoom ];

	var x = this._center.x;
	var y = this._center.y;
	//resolution = 1;
	//x = 200,y = 200;
	var viewWidth = this.viewWidth;
	var viewHeight = this.viewHeight;
	console.log(this._center)
	var viewBound = [
		x - resolution*viewWidth/2, 
		y - resolution*viewHeight/2, 
		x + resolution*viewWidth/2,
		y + resolution*viewHeight/2,
	]
	console.log("resolution", resolution, resolution*viewWidth/2)

	console.log("viewBound",viewBound)
	var bounds = [ - Mercator.EARTH_WIDTH, - Mercator.EARTH_WIDTH, Mercator.EARTH_WIDTH, Mercator.EARTH_WIDTH ]
	console.log("bounds", bounds)
	var startX = Math.floor(((viewBound[0] - bounds[0]) / resolution ) / 256);
	var startY = Math.floor(((viewBound[1] - bounds[1]) / resolution) / 256);
	var endX   = Math.floor(((viewBound[2] - bounds[2]) / resolution) / 256);
	var endY   = Math.floor(((viewBound[3] - bounds[3]) / resolution) / 256);
	console.log(startX,startY,endX,endY)

	var startTileX = bounds[0]+ (startX * 256 * resolution);
	var startTileY = bounds[3] - (startY * 256 * resolution);
	var distanceX = (bounds[0] - startTileX) / resolution;
	var distanceY = (startTileY - bounds[3]) / resolution
	console.log("startTileX", startTileX, startTileY, distanceX,distanceY)
}
*/

/**
 * @param {Object} opt 参数，如{url}
 */
function Tile( opt ){
	this.opt = opt;
	this.x = opt.x;
	this.y = opt.y;
	this.z = opt.z;
	this.xpos = opt.xpos;
	this.ypos = opt.ypos;
	this.url = opt.url;
}

Tile.prototype.getSource = function( ){
	var img = document.createElement('img');
	//img.src = this.getTileUrl( this.opt );
	img.src ="about:blank"
	return img;
}
Tile.prototype.getTileUrl = function( obj ){	
	if( this.url ){
		return this.url.replace(/{x}/ig, obj.x).replace(/{y}/ig, obj.y).replace(/{z}/ig, obj.z);
	}
	var num = (obj.x + obj.y) % 8 + 1;
	return 'http://mt2.google.cn/vt/lyrs=m@167000000&hl=zh-CN&gl=cn&x='+obj.x+'&y='+obj.y+'&z='+obj.z+'&s=Galil'
}