// 2D draw view
paper.install(window);
// Get a reference to the canvas object
var canvas = document.getElementById('myCanvas');
// Create an empty project and a view for the canvas:
paper.setup(canvas);

// global variables
let scene, renderer, orbit, axesHelper, gridHelper, gui, guiControls;
let drawPointControl, IntersectionControl, dragControls;
let point;
let ch_vertices, ch_lines, ch_curves;
let lineindex, startColor;

let newVertices;
let line_visble = true;

let vertices = [];
let points = [];
let lines = [];
let curve;
let pointcolors = [0x952323];

let vertices_group = [];
let points_group = [];
let lines_group = [];
let curves_group = [];

let intersect_points = [];

const width = window.innerWidth;
const height = window.innerHeight;

let reset_flag = false;
let drag_flag = true;
let intersection_flag = false;
let v_index = 0;
let l_index = 0;

let mouse = new THREE.Vector2();
let plane = new THREE.Plane();
let planeNormal = new THREE.Vector3();
let raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 0.25;
let planePoint = new THREE.Vector3();

let move_flag = false;

// scene
scene = new THREE.Scene();
scene.background = new THREE.Color("black");

// OrthographicCamera: left, right, top, button, near, far
const camera = new THREE.OrthographicCamera(-width/2, width/2, height/2, -height/2, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);
camera.zoom = 50;
camera.updateProjectionMatrix();

// renderer
renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

// axes Helper
axesHelper = new THREE.AxesHelper(12);
axesHelper.visible = false;
scene.add(axesHelper);

// grid helper
gridHelper = new THREE.GridHelper(20, 15);
gridHelper.rotation.x = Math.PI / 2;
gridHelper.position.set(0, 0, -0.001);
gridHelper.visible = false;
scene.add( gridHelper );

// GUI
guiSetup();

// Handling resize event

window.addEventListener('resize', resize, true);

function reset() {
    if (reset_flag == true) {
        vertices_group = [];
        points_group = [];
        lines_group = [];
        curves_group = [];

        vertices = [];
        points = [];
        lines = [];
        curve = null;
        pointcolors = [0x952323];

        intersect_points = [];

        v_index = 0;
        l_index = 0;

        dragControls.dispose();
        dragControls = null;

        while(scene.children.length > 0){ 
            scene.remove(scene.children[0]); 
        }
        
        scene.add(axesHelper);
        scene.add(gridHelper);

        drawPointControl.__li.style.borderLeftColor = decimalToRgb(pointcolors[pointcolors.length-1]);

        guiControls.num_splines = lines_group.length;
        gui.updateDisplay()

        IntersectionControl.__li.style.pointerEvents = "none";

        reset_flag = false;
        drag_flag = true;
        intersection_flag = false;
    }
}

function animate(){
    //axesHelper.visible = guiControls.axes;
    requestAnimationFrame( animate );
    renderer.render( scene, camera );
}

function decimalToRgb(decimal) {
    // 10진수(decimal) 색상 코드를 RGB 색상 코드로 변환
    var r = (decimal >> 16) & 255;
    var g = (decimal >> 8) & 255;
    var b = decimal & 255;
  
    // RGB 색상 코드로 변환하여 반환
    return 'rgb(' + r + ', ' + g + ', ' + b + ')';
  }

function resize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function updateCamera(zoom_factor) {
    camera.zoom = zoom_factor;
    camera.updateProjectionMatrix();
}

function guiSetup() {
    guiControls = new function() {
        this.drawPoint = function() {
            addcurve();

        }
        this.resetPoint = function() {
            reset();
        }
        this.num_splines = 0;
        this.intersection = function() {
            drawIntersectionPoints(findIntersection(curves_group[0], curve));
            intersection_flag = true;
        }
        this.axes = false;
        this.grid = false;
        this.line = true; 
        this.zoom_factor = 50; 
        this.resetView = function() {
            ZoomControl.setValue(50);
            updateCamera(50)
        }
    }
    
    gui = new dat.GUI();

    const folderDraw = gui.addFolder('Draw');
    drawPointControl = folderDraw.add(guiControls, 'drawPoint').name('Draw new control point');
    drawPointControl.__li.style.borderLeftColor = decimalToRgb(pointcolors[pointcolors.length-1]);
    folderDraw.add(guiControls, 'resetPoint').name('Reset curves');
    folderDraw.open();

    const folderIntersection = gui.addFolder('Intersection between curves');
    const NumSplines = folderIntersection.add(guiControls, 'num_splines').name('Num of splines');
    NumSplines.domElement.querySelector('input').disabled = true;
    IntersectionControl = folderIntersection.add(guiControls, 'intersection').name('Find intersection points');
    IntersectionControl.__li.style.pointerEvents = "none";
    folderIntersection.open();
    
    const folderVis = gui.addFolder('Visibility');
    folderVis.add(guiControls, 'axes').onChange(function() {
        axesHelper.visible = guiControls.axes;
    }).name('Axes');
    const gridVisibleControl = folderVis.add(guiControls, 'grid').onChange(function() {
        gridHelper.visible = guiControls.grid;
    }).name('Grid');
    gridVisibleControl.__li.style.outlineColor = "blue"
    folderVis.add(guiControls, 'line').onChange(function() {
        line_visble = guiControls.line;
        for (var i=0; i < lines.length; i++) {
            lines[i].visible = guiControls.line;
        }
        for (var i=0; i < lines_group.length; i++) {
            for (var j=0; j < lines_group[i].length; j++) {
                lines_group[i][j].visible = guiControls.line;
            }
        }
    }).name('Line');
    folderVis.open(); 
    
    const folderView = gui.addFolder('View');
    const ZoomControl = folderView.add(guiControls, 'zoom_factor', 0, 100);
    ZoomControl.step(1).name('Zoom').onChange(function() {
        if (guiControls.zoom_factor > 0.1)
            updateCamera(guiControls.zoom_factor);
    });
    ZoomControl.domElement.style.pointerEvents = "auto";
    ZoomControl.domElement.querySelector('input').disabled = true;
    folderView.add(guiControls, 'resetView').name('Reset view');
    folderView.open(); 
}

window.addEventListener( 'mousemove', mousemoveon);

window.addEventListener('dblclick', doubleclick);

window.addEventListener( 'mousewheel', function(e) {
    if (e.deltaY < 0) {
        if (guiControls.zoom_factor < 100) {
            guiControls.zoom_factor += 5;
            updateCamera(guiControls.zoom_factor);
        }
    }else {
        if (guiControls.zoom_factor > 1) {
            guiControls.zoom_factor -= 5;
            updateCamera(guiControls.zoom_factor);
        }
    }
    guiControls.zoom_factor = Math.round(guiControls.zoom_factor);
    gui.updateDisplay()
});

// prevent right click menu
window.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
});

function addcurve() {
    if (lines.length > 0) {
        vertices_group.push(vertices);
        points_group.push(points);
        lines_group.push(lines);
        curves_group.push(curve);

        vertices = [];
        lines = [];
        curve = null;

        pointcolors.push(pointcolors[pointcolors.length-1] * Math.random());
        drawPointControl.__li.style.borderLeftColor = decimalToRgb(pointcolors[pointcolors.length-1]);
        if (lines_group.length == 2) {
            IntersectionControl.__li.style.pointerEvents = "none";
            intersection_flag = false;
        }

        if (intersect_points.length > 0) {
            for (var i=0; i < intersect_points.length; i++) {
                scene.remove(intersect_points[i]);
            }
        }

        v_index = 0;
        l_index += 1;
    }
    else {
        alert("Please draw at least one curve");
    }
}

function changeattrib(lineindex) {
    if (l_index == lineindex) {
        ch_vertices = vertices;
        ch_lines = lines;
        ch_curves = curve;
    }else {
        ch_vertices = vertices_group[lineindex];
        ch_lines = lines_group[lineindex];
        ch_curves = curves_group[lineindex];
    }
}

function replaceattrib(lineindex, newVertices, newLines, newCurves) {
    if (l_index == lineindex) {
        vertices = newVertices;
        lines = newLines;
        curve = newCurves;
    }else {
        vertices_group[lineindex] = newVertices;
        lines_group[lineindex] = newLines;
        curves_group[lineindex] = newCurves;
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
    vertices.push(new THREE.Vector3(planePoint.x,planePoint.y, planePoint.z));
    var point_color = pointcolors[pointcolors.length-1];
    var point_geometry = drawpoint(vertices[vertices.length-1], point_color);
    scene.add(point_geometry);
    points.push(point_geometry);
    v_index += 1;
    dragCallback(points);

    if (vertices.length > 1) {
        var lines_draw = [];
        lines_draw.push(vertices[vertices.length-2]);
        lines_draw.push(vertices[vertices.length-1]);
        var line = drawline(lines_draw, 0x363062);
        scene.add(line);
        lines.push(line);

        if (line_visble == false) {
            line.visible = false;
        }
        
        scene.remove(curve);
        curve = drawcurve(vertices);
        scene.add(curve);
    }
    guiControls.num_splines = lines_group.length+1;
    gui.updateDisplay()
    if (guiControls.num_splines == 2) {
        IntersectionControl.__li.style.pointerEvents = "auto";
        if (intersection_flag) {
            drawIntersectionPoints(findIntersection(curves_group[0], curve));
        }
    }
    reset_flag = true;
}

function drawpoint(point, point_color, point_size=20){
    if (point.z == undefined) {
        point.z = 0;
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'index', new THREE.Uint16BufferAttribute(new THREE.Vector2(v_index), 1));
    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( new THREE.Vector3(point.x,point.y, point.z), 3 ) );
    geometry.setAttribute( 'line_index', new THREE.Uint16BufferAttribute(new THREE.Vector2(l_index), 1));
    var material = new THREE.PointsMaterial( {color:point_color, size: point_size} );
    const p = new THREE.Points( geometry, material );
    return p;
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

function dragCallback(points) {
    if (drag_flag == true) {
        dragControls = new THREE.DragControls( points, camera, renderer.domElement );
        dragControls.addEventListener( 'dragstart', dragStartCallback );
        dragControls.addEventListener( 'dragend', dragendCallback );
        drag_flag = false;
    }
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
        
        if (intersection_flag) {
            drawIntersectionPoints(findIntersection(curves_group[0], curve));
        }

        move_flag = false;
    }
}

function float32Array2PointArray(float32Array) {
    var pointArray = [];
    for (var i = 0; i < float32Array.length; i+=3) {
        pointArray.push(new Point(float32Array[i], float32Array[i+1]));
    }
    return pointArray;
}
function findIntersection(curve1, curve2) {
    var curve1_vertices = float32Array2PointArray(curve1.geometry.attributes.position.array);
    var curve2_vertices = float32Array2PointArray(curve2.geometry.attributes.position.array);

    // Move to start and draw a line from there
    var curve1_path = new Path();
    curve1_path.strokeColor = 'black';
    for (var i = 0; i < curve1_vertices.length; i++) {
        curve1_path.add(curve1_vertices[i]);
    }
    
    var curve2_path = new Path();
    curve2_path.strokeColor = 'black';
    curve2_path.strokeColor = 'black';
    for (var i = 0; i < curve2_vertices.length; i++) {
        curve2_path.add(curve2_vertices[i]);
    }
    
    var intersections = curve1_path.getIntersections(curve2_path);

    return intersections;
}   

function drawIntersectionPoints(intersection_points) {
    for (var i=0; i < intersect_points.length; i++) {
        scene.remove(intersect_points[i]);
    }
    for (var i = 0; i < intersection_points.length; i++) {
        var intersect_point = drawpoint(intersection_points[i].point, "red", 10);
        intersect_points.push(intersect_point);
        scene.add(intersect_point);
    }
}

animate();