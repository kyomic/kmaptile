### 简单的地图
一个最简单的地图，实现了Tile的拼接，支持Google,Openstreetmap, 四维底图
仅供学习与探讨，感谢加星支持！（所有算法都来源网络）


### 简单示例

```
<div class="map" id="map"></div>
<script type="text/javascript">
    var map = new Map('map');
    map.centerAndZoom( new LonLat(116.40,39.90) );
</script>
```

### API文档

```
map.centerAndZoom( lnglat , level )
map.zoomIn( pt )
map.zoomOut( pt )
map.panTo(x,y)
map.setLayer( option )

```
