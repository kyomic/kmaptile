function MapLayer( map, option ){
	var layer = document.createElement("div");
	layer.className = "mlayer"
	map.layerroot.appendChild( layer );
	this.root = layer;
	this.option = option || {};
}

MapLayer.prototype.loadTile = function( tile ){
	if( this.option.url ){
		tile.url = this.option.url;
	}
	var source = tile.getSource();
	source.className = 'tile'
	source.style.cssText = 'left:' + (tile.xpos) + 'px;top:' + (tile.ypos) + 'px'
	this.root.appendChild( source );
}
MapLayer.prototype.clear = function(){
	this.root.innerHTML = '';
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
	var earth_width = Mercator.EARTH_WIDTH;
	this.resolutions = [];
	for(var i=0;i<this.maxLevel;i++){
		this.resolutions[i] = earth_width * 2 / this.tileSize / ( Math.pow(2, i ));
	}
	this.mapLayers["default"] = new MapLayer( this );
	console.log("分辨率",this.resolutions)
}
Map.prototype.getLayer = function(){
	return this.mapLayers['default'];
}
Map.prototype.setLayer = function( option ){
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
	console.log("原始经纬度", this.lon,this.lat )
	var trans = GpsCorrect.transform( this.lon, this.lat );
	this.lat = trans.lat;
	this.lon = trans.lon;
	console.log("新始经纬度", this.lon,this.lat )
	if( !this.x ){
		var p = Mercator.toPixed( this.lon,this.lat );
		this.x = p.x;
		this.y = p.y;		
	}

}
Map.prototype.centerAndZoom = function( center, zoom ){
	this._center = center;
	this._zoom = zoom || 12;
	console.log("localPt:", this._center)
	//console.log( Mercator.toPixed( -180,-85.05112877980659),Mercator.toPixed(180,85.05112877980659))
	//console.log( Mercator.toLonLat( -Mercator.EARTH_WIDTH,-Mercator.EARTH_WIDTH),Mercator.toLonLat(Mercator.EARTH_WIDTH,Mercator.EARTH_WIDTH))
	console.log( this.LonLat2TileXY( this._center.lon, this._center.lat ))
	this._draw();
}

Map.prototype.LonLat2TileXY = function( lon, lat ){
	var n = Math.pow(2, this._zoom);
	var radius = Math.PI / 180;
    var tileX = ((lon + 180) / 360) * n;
    var tileY = (1 - (Math.log(Math.tan(radius * lat ) + (1 / Math.cos(radius*lat))) / Math.PI)) / 2 * n;
    return {
    	x:tileX,y:tileY
    }
}
Map.prototype.TileXY2LonLat = function( x, y ){
	var n = Math.pow(2, this._zoom);
    var lon = x / n * 360.0 - 180.0;
    var lat = Math.atan(Math.sin(Math.PI * (1 - 2 * y / n)));
    lat = lat * 180.0 / Math.PI;
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
	var maxX = Math.ceil(this.viewWidth / this.tileSize/2);
	var maxY = Math.ceil(this.viewHeight / this.tileSize/2);

	var pt = this.LonLat2TileXY( this._center.lon, this._center.lat );
	var x = pt.x, y = pt.y;
	var startX = Math.floor(x-maxX)
	var startY = Math.floor(y-maxY)
	for(var i= startX;i< x + maxX; i++){
		for(var j= startY;j< y + maxY; j++){
			//console.log('startx',i, 'starty',j, Math.pow(2, this._zoom))
			console.log('startX===', i - startX - Math.floor(maxX))
			var tile = new Tile({
				x:i,y:j,z:this._zoom, 
				xpos:(i-startX - maxX) * 256 + 128, 
				ypos:(j-startY - maxY) * 256 + 128
			});
			this.loadTile( tile );
		}
	}
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
	img.src = this.getTileUrl( this.opt );
	return img;
}
Tile.prototype.getTileUrl = function( obj ){
	if( this.url ){
		return this.url.replace(/{x}/ig, obj.x).replace(/{y}/ig, obj.y).replace(/{z}/ig, obj.z);
	}
	var num = (obj.x + obj.y) % 8 + 1;
	return 'http://mt2.google.cn/vt/lyrs=m@167000000&hl=zh-CN&gl=cn&x='+obj.x+'&y='+obj.y+'&z='+obj.z+'&s=Galil'
}