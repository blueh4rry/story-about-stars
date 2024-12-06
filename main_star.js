import * as THREE from 'three';
import { OrbitControls } from '../module/three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from '../module/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../module/three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../module/three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FXAAShader } from '../module/three/examples/jsm/shaders/FXAAShader.js';
import { ShaderPass } from '../module/three/examples/jsm/postprocessing/ShaderPass.js';
import { FontLoader } from '../module/three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from '../module/three/examples/jsm/geometries/TextGeometry.js'

//#region Settings

///Initialization
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
camera.position.y = 15;
var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

//GUI variables
const values = {
	surface_temp: 6000,
	color_index: 0.59,
	spectal_type: 'G',
	t_fixed: false,
	solar_luminosity: 1,
	luminosity: 3.828,
	absolute_magnitude: 4.83,
	l_fixed: false,
	solar_radius: 1,
	radius: 6.9,
	r_fixed: true,
	center_position: 'sun',
	orbit: false,
	scale: false,
	au: false,
	parsec: false
}

//Render(Bloom) Settings
var renderScene = new RenderPass(scene, camera);
var effectFXAA = new ShaderPass( THREE.FXAAShader );
const pixelRatio = renderer.getPixelRatio();
effectFXAA.uniform = {
	resolution: {
		type: "v2",
		value: {
			x: 1 / (window.innerWidth * pixelRatio),
			y: 1 / (window.innerHeight * pixelRatio)
		}
	}
}
var bloomPass = new UnrealBloomPass(
	new THREE.Vector2(window.innerWidth, window.innerHeight),0.7,0.2,0
);
var bloomComposer = new EffectComposer(renderer);
bloomComposer.addPass(renderScene);
bloomComposer.addPass(bloomPass);

//Orbit Control
var controls = new OrbitControls(camera, renderer.domElement);

//#endregion


const light = new THREE.AmbientLight( 0xd0d0d0, 1.2 ); // soft white light
scene.add( light );

//Main star
var loader = new THREE.TextureLoader();
var bg_star = new THREE.Mesh( new THREE.SphereGeometry( 1.1, 32, 16 ), new THREE.MeshPhongMaterial({
	// map: loader.load("../textures/8k_sun.jpg")
}) );
var bg_star2 = new THREE.Mesh( new THREE.SphereGeometry( 1, 32, 16 ), new THREE.MeshBasicMaterial({
	//map: loader.load("../textures/8k_sun.jpg")
}) );
var rgbs = temp_to_rgb(6000);
// bg_star.material.color.setRGB(rgbs[0],rgbs[1],rgbs[2]);
bg_star.material.color.setRGB(rgbs[0]*1.5*1.299,rgbs[1]*1.5*1.587,rgbs[2]*1.5*1.114);
	
bg_star2.material.color.setRGB(rgbs[0],rgbs[1],rgbs[2]);
bg_star2.layers.enable(1);
scene.add(bg_star);
scene.add(bg_star2);

//Planet Earth

var planet = new THREE.Mesh( 
	new THREE.SphereGeometry( 0.1, 32, 16 ), new THREE.MeshPhongMaterial({
		map: loader.load("../textures/earth_map.jpg")
	}) 
);
planet.position.set(2,0,0);
//scene.add(planet);

//Light
var pointLight = new THREE.PointLight(0xffffff, 3, 0, 3);
scene.add(pointLight);
var orbit = new THREE.EllipseCurve(0, 0, 20, 20, 0, 2*Math.PI);
var points = orbit.getSpacedPoints(200);
var geometry = new THREE.BufferGeometry().setFromPoints(points);
var material = new THREE.LineBasicMaterial({color:0xffffff, transparent: true, opacity: 0.5});
var orbit_line = new THREE.Line(geometry,material);
orbit_line.rotateX(-Math.PI/2);


 
//#endregion


//Render 
render();
function render() {
	requestAnimationFrame( render );

	//Background star rotate
	bg_star.rotation.y += 0.0000005;
	//bg_star.rotation.y += 0.01;

	//Planet orbiting center star
	var time = 0.000005 * performance.now();
	var t = (time % 1) / 1
	let p = orbit.getPoint(-t);
	planet.position.x=p.x;
	planet.position.z=p.y;

	//Changing center position 
	if(values.center_position=='sun'){
		controls.target.set(0, 0, 0);
		controls.update();
	}else if(values.center_position=='earth'){
		controls.target.set(planet.position.x, planet.position.y, planet.position.z);
		controls.update();
	}

	renderer.autoClear = false;
	renderer.clear();

	camera.layers.set(1);
	bloomComposer.render();

	renderer.clearDepth();
	camera.layers.set(0);
	renderer.render(scene, camera);
};

//GUI actions
const gui = new dat.GUI({width: 400});

//#region Temperature section
const folder_temperature = gui.addFolder("Temperature");
folder_temperature.add(values, "surface_temp", 2400, 50000).onChange(function (value) {
	values.color_index = (1 / (46 * values.surface_temp)) * (Math.sqrt(729 * values.surface_temp * values.surface_temp + 52900000000) - 58 * values.surface_temp + 230000);
	values.spectal_type = temp_to_type(values.surface_temp);
	if(Math.round(values.surface_temp) == 5778 && Math.round(values.solar_luminosity) == 1 && Math.round(values.solar_radius) == 1){
		scene.add(planet,orbit_line);
		values.orbit = true;
	} else {
		scene.remove(planet,orbit_line);
		values.orbit = false;
	}
	restrict_for_temp();
	refresh_all();
}).name("Surface Temperature(K)");

folder_temperature.add(values, "color_index", -0.57, 2.98).onChange(function (value){
	values.surface_temp = 4600 * ((1 / ((0.92 * values.color_index) + 1.7)) + (1 / ((0.92 * values.color_index) + 0.62)));
	values.spectal_type = temp_to_type(values.surface_temp);
	restrict_for_temp();
	refresh_all();
}).name("Color Index(B-V)");
folder_temperature.add(values, "spectal_type").name("Spectal Type");
folder_temperature.add(values, "t_fixed").onChange(function (value){
	if(values.t_fixed == false){
		values.l_fixed = false;
		values.r_fixed = true;
	}else{
		values.l_fixed = false;
		values.r_fixed = false;
	}
	refresh_all();
}).name("Fixed");
folder_temperature.open();
//#endregion
//#region Luminosity section
const folder_luminosity = gui.addFolder("Luminosity");
folder_luminosity.add(values, "solar_luminosity", 0.3, 5600).onChange(function (value){
	values.absolute_magnitude = 4.83 + (-2.5)*Math.log10(values.solar_luminosity);
	values.luminosity = values.solar_luminosity * 3.828;
	restrict_for_luminosity();
	refresh_all();
}).name("Solar Luminosity(L☉)");
folder_luminosity.add(values, "luminosity",3.8,21500).onChange(function (value){
	values.solar_luminosity = values.luminosity/3.828;
	values.absolute_magnitude = 4.83 + (-2.5)*Math.log10(values.solar_luminosity);
	restrict_for_luminosity();
	refresh_all();
}).name("Luminosity(10^26W)");
folder_luminosity.add(values, "absolute_magnitude", -4.5, 8.6).onChange(function (value){
	values.solar_luminosity = Math.pow(10, (-0.4)*(values.absolute_magnitude - 4.83));
	values.luminosity = values.solar_luminosity * 3.828;
	restrict_for_luminosity();
	refresh_all();
}).name("Absolute Magnitude");
folder_luminosity.add(values, "l_fixed").onChange(function (value){
	if(values.l_fixed == false){
		values.t_fixed = false;
		values.r_fixed = true;
	}else{
		values.t_fixed = false;
		values.r_fixed = false;
	}
	refresh_all();
}).name("Fixed");
folder_luminosity.open();
//#endregion
//#region Radius section
const folder_radius = gui.addFolder("Radius");
folder_radius.add(values, "solar_radius", 0.5, 15).onChange(function (value){
	values.radius = values.solar_radius *  6.6934;
	restrict_for_radius();
	refresh_all();
}).name("Solar Radius(R☉)");
folder_radius.add(values, "radius",3.3,100).onChange(function (value){
	values.solar_radius = values.radius / 6.6934;
	restrict_for_radius();
	refresh_all();
}).name("Radius(10^5km)")
folder_radius.add(values, "r_fixed").onChange(function (value){
	if(values.r_fixed == false){
		values.t_fixed = false;
		values.l_fixed = true;
	}else{
		values.t_fixed = false;
		values.l_fixed = false;
	}
	refresh_all();
}).name("Fixed");
folder_radius.open();
//#endregion
//#region Settings section
const folder_settings = gui.addFolder("Settings");
folder_settings.add(values, "center_position").onChange(function (value){
}).name("Center Position");
folder_settings.add(values, "orbit").onChange(function (value){
	if(values.orbit == true){
		scene.add(orbit_line);
	}else{
		scene.remove(orbit_line);
	}
}).name("Show orbit");
folder_settings.add(values, "scale").onChange(function (value){
	if(values.scale == true){
		orbit.xRadius = 200;
		orbit.yRadius = 200;
		scene.remove(orbit_line);
		points = orbit.getSpacedPoints(200);
		geometry = new THREE.BufferGeometry().setFromPoints(points);
		orbit_line = new THREE.Line(geometry,material);
		orbit_line.rotateX(-Math.PI/2);
		if(values.orbit == true){
			scene.add(orbit_line);
		}
	}else{
		orbit.xRadius = 20;
		orbit.yRadius = 20;
		scene.remove(orbit_line);
		points = orbit.getSpacedPoints(200);
		geometry = new THREE.BufferGeometry().setFromPoints(points);
		orbit_line = new THREE.Line(geometry,material);
		orbit_line.rotateX(-Math.PI/2);
		if(values.orbit == true){
			scene.add(orbit_line);
		}
	}
}).name("Real scale");
folder_settings.add(values, "au").onChange(function (value) {
	
}).name("Show 1AU");
folder_settings.add(values, "parsec").onChange(function (value) {
}).name("Show 1pc");
folder_settings.open();
//#endregion

//Convert functions
function refresh_all(){
	gui.updateDisplay();
	if(values.surface_temp >= 6000){
		bg_star.scale.setScalar(values.solar_radius*1.1);
	}else{
		bg_star.scale.setScalar(values.solar_radius*0.9);
	}
	bg_star2.scale.setScalar(values.solar_radius);
	var rgbs = temp_to_rgb(values.surface_temp);
	bg_star.material.color.setRGB(rgbs[0]*1.5*1.299,rgbs[1]*1.5*1.587,rgbs[2]*1.5*1.114);
	bg_star2.material.color.setRGB(rgbs[0],rgbs[1],rgbs[2]);
	bloomPass.strength = 1 + 2*Math.log10(values.solar_luminosity);
}
function restrict_for_temp(){
	if(values.r_fixed == true && values.l_fixed == false){
		quantity_to_luminosity();
	}else if(values.r_fixed == false && values.l_fixed == true){
		quantity_to_radius();
	}else if(values.t_fixed == true){
		values.t_fixed = false;
		values.r_fixed = true;
	}
}
function restrict_for_luminosity(){
	if(values.r_fixed == true && values.t_fixed == false){
		quantity_to_temps();
	}else if (values.r_fixed == false && values.t_fixed == true){
		quantity_to_radius();
	}else if(values.l_fixed == true){
		values.l_fixed = false;
		values.r_fixed = true;
	}
}
function restrict_for_radius(){
	if(values.t_fixed == true && values.l_fixed == false){
		quantity_to_luminosity();
	}else if(values.t_fixed == false && values.l_fixed == true){
		quantity_to_temps();
	}else if(values.r_fixed == true){
		values.r_fixed = false;
		values.l_fixed = true;
	}
}
function quantity_to_luminosity(){
	var sigma = 5.67/Math.pow(10,8);
	var r = 696340000 * values.solar_radius;
	var l = 3.828*Math.pow(10,26);
	var s_l = 4*Math.PI*r*r*sigma*Math.pow(values.surface_temp,4)/l;
	values.solar_luminosity = s_l;
	values.luminosity = s_l * 3.828;
	values.absolute_magnitude = 4.83 + (-2.5)*Math.log10(s_l);
}
function quantity_to_radius(){
	values.solar_radius = Math.pow(values.solar_luminosity,0.5)/Math.pow(values.surface_temp/5778,2);
	values.radius = values.solar_radius * 6.9634;
}
function quantity_to_temps(){
	values.surface_temp = 5778 * values.solar_luminosity / (values.solar_radius*values.solar_radius);
	values.color_index = temp_to_index(values.surface_temp);
	values.spectal_type = temp_to_type(values.surface_temp);
}
function temp_to_type(t){
	var spectal_type;
	if(t>=2400 && t<3700){
		spectal_type = 'M';
	}else if(t>=3700 && t<5200){
		spectal_type = 'K';
	}else if(t>=5200 && t<6000){
		spectal_type = 'G';
	}else if(t>=6000 && t<7500){
		spectal_type = 'F';
	}else if(t>=7500 && t<10000){
		spectal_type = 'A';
	}else if(t>=10000 && t<30000){
		spectal_type = 'B';
	}else if(t>=30000){
		spectal_type = 'O';
	}
	return spectal_type;
}
function temp_to_rgb(t) {
	var x, y;
  
	if (t >= 1667 & t <= 4000) {
	  x = ((-0.2661239 * Math.pow(10,9)) / Math.pow(t,3)) + ((-0.2343580 * Math.pow(10,6)) / Math.pow(t,2)) + ((0.8776956 * Math.pow(10,3)) / t) + 0.179910
	} else if (t > 4000) {
	  x = ((-3.0258469 * Math.pow(10,9)) / Math.pow(t,3)) + ((2.1070379 * Math.pow(10,6)) / Math.pow(t,2)) + ((0.2226347 * Math.pow(10,3)) / t) + 0.240390
	}
  
	if (t >= 1667 & t <= 2222) {
	  y = -1.1063814 * Math.pow(x,3) - 1.34811020 * Math.pow(x,2) + 2.18555832 * x - 0.20219683
	} else if (t > 2222 & t <= 4000) {
	  y = -0.9549476 * Math.pow(x,3) - 1.37418593 * Math.pow(x,2) + 2.09137015 * x - 0.16748867
	} else if (t > 4000) {
	  y = 3.0817580 * Math.pow(x,3) - 5.87338670 * Math.pow(x,2) + 3.75112997 * x - 0.37001483
	}
  
	var Y = 1.0
	var X = (y == 0)? 0 : (x * Y) / y
	var Z = (y == 0)? 0 : ((1 - x - y) * Y) / y
  
	//XYZ to rgb
	var r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z
	var g = -0.9689 * X + 1.8758 * Y + 0.0415 * Z
	var b = 0.0557 * X - 0.2040 * Y + 1.0570 * Z
	
	//linear RGB to sRGB
	var R = (r <= 0.0031308)? 12.92*r : 1.055*Math.pow(r,1/0.5)-0.055
	var G = (g <= 0.0031308)? 12.92*g : 1.055*Math.pow(g,1/0.5)-0.055
	var B = (b <= 0.0031308)? 12.92*b : 1.055*Math.pow(b,1/0.5)-0.055
  
	return [R,G,B]
}
function temp_to_index(t){
	var index = (1 / (46 * t)) * (Math.sqrt(729 * t * t + 52900000000) - 58 * t + 230000);
	return index;
}
