// global variables
let scene, renderer, orbit, point, point_geometry;
let axesHelper, gridHelper;
let ch_vertices, ch_lines, ch_curves;

let newVertices;
let line_visble = true;

var vertices = [];
var points = [];
var lines = [];
var curve;
var pointcolors = [0x952323];

var vertices_temp = [];
var points_temp = [];
var lines_temp = [];
var curves_temp = [];

const width = window.innerWidth;
const height = window.innerHeight;

var v_index = 0;
var l_index = 0;

var mouse = new THREE.Vector2();
var plane = new THREE.Plane();
var planeNormal = new THREE.Vector3();
var raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 0.25;
var planePoint = new THREE.Vector3();

let move_flag = false;

// scene
scene = new THREE.Scene();
scene.background = new THREE.Color("black");

// OrthographicCamera: left, right, top, button, near, far
const camera = new THREE.OrthographicCamera(-width/2, width/2, height/2, -height/2, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);
camera.zoom = 20;
camera.updateProjectionMatrix();

// renderer
renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

// axes Helper
axesHelper = new THREE.AxesHelper(30);
axesHelper.visible = false;
scene.add(axesHelper);

// grid helper
gridHelper = new THREE.GridHelper(50, 30);
gridHelper.rotation.x = Math.PI / 2;
gridHelper.position.set(0, 0, -0.001);
gridHelper.visible = false;
scene.add( gridHelper );

// GUI
guiSetup(); 

// Handling resize event

window.addEventListener('resize', resize, true);

function animate(time){
    //axesHelper.visible = guiControls.axes;
    requestAnimationFrame( animate );
    renderer.render( scene, camera );
}

function resize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function guiSetup() {
    const guiControls = new function() {
        this.drawPoint = function() {
            addcurve();
        }
        this.axes = false;
        this.grid = false;
        this.line = true; 
        this.zoom_factor = 1; 
        this.resetView = function() {
            camera.zoom = 20;
            ZoomControl.setValue(1.0);
            camera.updateProjectionMatrix();
        }
    }
    
    const gui = new dat.GUI();

    const folderDraw = gui.addFolder('Draw');
    const drawPointControl = folderDraw.add(guiControls, 'drawPoint').name('draw point');
    folderDraw.open();
    
    const folderVis = gui.addFolder('Visibility');
    const axesVisibleControl = folderVis.add(guiControls, 'axes').onChange(function() {
        axesHelper.visible = guiControls.axes;
    });
    const gridVisibleControl = folderVis.add(guiControls, 'grid').onChange(function() {
        gridHelper.visible = guiControls.grid;
    });
    const arrowVisibleControl = folderVis.add(guiControls, 'line').onChange(function() {
        line_visble = guiControls.line;
        for (var i=0; i < lines.length; i++) {
            lines[i].visible = guiControls.line;
        }
        for (var i=0; i < lines_temp.length; i++) {
            for (var j=0; j < lines_temp[i].length; j++) {
                lines_temp[i][j].visible = guiControls.line;
            }
        }
    });
    folderVis.open(); 
    
    const folderArrow = gui.addFolder('View');
    const ZoomControl = folderArrow.add(guiControls, 'zoom_factor', 0.1, 2.0);
    ZoomControl.step(0.001).name('zoom').onChange(function() {
        camera.zoom = guiControls.zoom_factor*20;
        camera.updateProjectionMatrix();
    });
    const resetViewControl = folderArrow.add(guiControls, 'resetView').name('reset view');
    folderArrow.open(); 
}


window.addEventListener( 'mousemove', mousemoveon);

window.addEventListener('dblclick', doubleclick);

// prevent right click menu
window.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
});

function addcurve() {
    vertices_temp.push(vertices);
    points_temp.push(points);
    lines_temp.push(lines);
    curves_temp.push(curve);

    vertices = [];
    points = [];
    lines = [];
    curve = null;

    pointcolors.push(pointcolors[pointcolors.length-1] * Math.random());

    v_index = 0;
    l_index += 1;
}

function changeattrib(lineindex) {
    if (l_index == lineindex) {
        ch_vertices = vertices;
        ch_lines = lines;
        ch_curves = curve;
    }else {
        ch_vertices = vertices_temp[lineindex];
        ch_lines = lines_temp[lineindex];
        ch_curves = curves_temp[lineindex];
    }
}

function replaceattrib(lineindex, newVertices, newLines, newCurves) {
    if (l_index == lineindex) {
        vertices = newVertices;
        lines = newLines;
        curve = newCurves;
    }else {
        vertices_temp[lineindex] = newVertices;
        lines_temp[lineindex] = newLines;
        curves_temp[lineindex] = newCurves;
    }
}

function mousemoveon(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    planeNormal.copy(camera.position).normalize();
    plane.setFromNormalAndCoplanarPoint(planeNormal, scene.position);
    raycaster.ray.intersectPlane(plane, planePoint);
}

function doubleclick(e) {
    drawpoint();
    if (vertices.length > 1) {
        var lines_draw = [];
        lines_draw.push(vertices[vertices.length-2]);
        lines_draw.push(vertices[vertices.length-1]);
        var line = drawline(lines_draw, 0x363062);
        scene.add(line);
        lines.push(line);

        if (line_visble == false) {
            line.visible = false;
            // for (var i=0; i < lines.length; i++) {
            //     lines[i].visible = false;
            // }
        }
        
        scene.remove(curve);
        curve = drawcurve(vertices);
        scene.add(curve);
    }
}

function drawpoint(){
    vertices.push(new THREE.Vector3(planePoint.x,planePoint.y, planePoint.z));
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'index', new THREE.Uint16BufferAttribute(new THREE.Vector2(v_index), 1));
    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( new THREE.Vector3(planePoint.x,planePoint.y, planePoint.z), 3 ) );
    geometry.setAttribute( 'line_index', new THREE.Uint16BufferAttribute(new THREE.Vector2(l_index), 1));
    var material = new THREE.PointsMaterial( {color:pointcolors[pointcolors.length-1], size: 20} );
    const p = new THREE.Points( geometry, material );
    scene.add( p );
    points.push(p);
    point_geometry = geometry;
    point = p;

    v_index += 1;

    if (points.length > 0) {
        var controls = new THREE.DragControls( points, camera, renderer.domElement );
        controls.addEventListener( 'dragstart', dragStartCallback );
        controls.addEventListener( 'dragend', dragendCallback );
    }
}

function drawline(points, color){
    var lineGeometry = new THREE.BufferGeometry().setFromPoints( points );
    var lineMaterial = new THREE.LineBasicMaterial( { color: color } );
    var line = new THREE.Line( lineGeometry, lineMaterial );
    return line;
}


function drawcurve(vertices){
    var spline = new BSpline(vertices,3,true);
    var oldx, oldy, x, y;
    var curve_points = [];
    oldx = spline.calcAt(0)[0];
    oldy = spline.calcAt(0)[1];
    curve_points.push(new THREE.Vector3(oldx, oldy, 0));
    for(var t = 0;t <= 1;t+=0.001){
        var interpol = spline.calcAt(t);
        x = interpol[0];
        y = interpol[1];
        curve_points.push(new THREE.Vector3(x, y, 0));
    }
    var curve = drawline(curve_points, 0xB4B4B3);
    return curve;
}

function dragStartCallback(event) {
    lineindex = event.object.geometry.attributes.line_index.array[0];
	startColor = pointcolors[lineindex];
	event.object.material.color.setHex(0xF4E869);
    move_flag = true;
}

function dragendCallback(event) {
    if (move_flag == true) {
        event.object.material.color.setHex(startColor);
        changeattrib(lineindex);
        for (var i=0; i < ch_lines.length; i++) {
            scene.remove(ch_lines[i]);
        }
        scene.remove(ch_curves);

        var newLines = [];
        var newVertices = [];
        for (var j = 0; j < ch_vertices.length; j++) {
            newVertices.push(ch_vertices[j].clone()); // 각 요소를 복제하여 새로운 배열에 추가
        }

        newVertices[event.object.geometry.attributes.index.array[0]] = planePoint;

        for (var i=0; i < newVertices.length-1; i++) {
            var lines_draw = [];
            lines_draw.push(newVertices[i]);
            lines_draw.push(newVertices[i+1]);
            var newline = drawline(lines_draw, 0x363062);
            scene.add(newline);
            if (line_visble == false) {
                newline.visible = false;
            }
            newLines.push(newline);
        }

        var replaceVertices = [];
        for (var j = 0; j < newVertices.length; j++) {
            replaceVertices.push(newVertices[j].clone()); // 각 요소를 복제하여 새로운 배열에 추가
        }

        var newcurve = drawcurve(replaceVertices);
        scene.add(newcurve);
        replaceattrib(lineindex, replaceVertices, newLines, newcurve);

        move_flag = false;
    }
}

animate();
