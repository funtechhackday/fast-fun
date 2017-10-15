var light, canvas, renderer, scene, camera;
var width, height;
var size = 2000;	// Размер сетки карты {4000x4000}
var SIZE_PLAYER = 100;

var elem;	// Для работы с приближением/отдалением карты

var PIG_MODEL = 0;

var model_src = [];	// Все доступные модели, подгружаються к players
var clock = new THREE.Clock();	 // Время используеться для анимации
var debug = false;
// 0: управление {W, S, A, D, WD, WA, SD, SA}
// 1: Взаимодействие {E, Q, EQ}
// 2: Доп. взаимодействие{Shift, Space, Shift Space}
// 3: Мышь {ЛКМ, ПКМ, ЛКМ ПКМ}
var ctrl = new Uint8Array([0,0]);			// 0: событие; 1: какое действие
var mouse = new Float32Array([0.0, 0.0])	// Координаты нажатия мыши 8 байт
var mouseX = 0.0;
var mouseY = 0.0;

var name;				// Имя игрока Предел 20 символов


var latitude = 600;
var longitude = 600;

// Набор звуков для 
var srcSound = [
];
// Набор загруженных звуков
var bufferSound;

//Load a sound and set it as the PositionalAudio object's buffer
/*var audioLoader1 = new THREE.AudioLoader();
audioLoader1.load( 'sounds/'+srcSound[0], function( buffer ) {
	bufferSound = buffer;
	//console.log(bufferSound);
});*/


// Преобразование в строку из Uint16 14.12.16
function ab2str(buf) {
	return String.fromCharCode.apply(null, buf);
}
// Преобразование в Uint16 из string 14.12.16
function str2ab(str) {
	var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
	var bufView = new Uint16Array(buf);
	for (var i = 0, strLen=str.length; i<strLen; i++) {
		bufView[i] = str.charCodeAt(i);
		//console.log(bufView[i]);
	}
	return bufView;
}




var wsUri = "ws://" + document.location.host+":8080/ws";
var wsProtocol = "fast-fun";
var websocket;
var idPlayer = null; 

// Использовать как Объект (13.10.2016)
var players = {};


var iLoad = 0;
// (14.10.2017) Для корректной загрузки моделей без анимации:
// вначале загужаем модели с анимацией, а затем без анимации
var anim_model = 1;
var src = [
	'gHost_v1.1ma40.json',			// [0]
	'clock_v1.1ma40.json',
	'Pig_v1.4ma40.json',	
	'cat_v1.3ma60.json',
	'Dog_v1.3ma60.json',	// [4]
	
	// Боты
	'Sweetie1.json',			// [5]
	'Sweetie2.json'
	
	// Декорации
	// ..
	
	
];
// Загрузчик моделей
function loaderNew(){
	
	var loader = new THREE.JSONLoader();
	loader.load(
		'model/'+src[iLoad],
		function ( geometry, materials ) {
			model_src.push( new Model( geometry, materials ) );
			if(iLoad < src.length-1){
				iLoad++;
				loaderNew();
			} else{
				getlocatin();
			}
		}
	);
	
}

// tmp geo т.к на телефонах ошибка
function getlocatin(){
	navigator.geolocation.getCurrentPosition(showinfo, showerror);
}

function showinfo(position){
	latitude = position.coords.latitude;
	longitude = position.coords.longitude;
	//alert("спс в:"+latitude+" д:"+longitude);
}

function showerror(){
	//alert("Ну и жадина");
}


// Конструктор модели
function Model(geometry, materials){
	this.skinnedMesh = new THREE.SkinnedMesh(geometry, materials);
	/*if(iLoad < anim_model)	// Для моделей без анимации
	for ( var k in materials ) {
		materials[k].skinning = true;
	}*/
}

// Объект игрок (14.10.2017)
// {id:id, model:model_src[m].skinnedMesh.clone(), x:x, y:y, z:z, a:a, m:m, anim:anim, name:nameplr}
function NewPlayer( opt ){

	players[opt.id] = {
		model: opt.model,
		mixer:new THREE.AnimationMixer( opt.model ),
		x: opt.x,
		y: opt.y,
		z: opt.z,
		a: opt.a,
		m: opt.m,
		anim: opt.anim,
		name: ( opt.name != null ) ? opt.name : null,
		text: ( opt.name != null ) ? new FastText({
			string: opt.name+' ('+opt.hp+')',
			fontsize: 20,
			x: opt.x,
			y: opt.y,
			shiftX:0,
			shiftY:0,
			area: false
		}) : null,
		
	};

	//console.log(players[opt.id].sound);
	if(opt.sound == true){
		players[opt.id].sound.setBuffer( bufferSound );
		players[opt.id].sound.setRefDistance( 50 );
		
		//players[opt.id].sound.set(opt.x, opt.y, opt.z+20);
		players[opt.id].sound.x = opt.x;
		players[opt.id].sound.y = opt.y;
		players[opt.id].sound.z = opt.z+20;
		
		//players[opt.id].sound.play();
		scene.add( players[opt.id].sound );
	}
	
	
	
	players[opt.id].model.position.set(opt.x, opt.y, opt.z);
	players[opt.id].model.rotation.z = opt.a;
	
	//
	
	// Добавление осей
	//players[opt.id].model.add(new THREE.AxisHelper(5));
	
	//if(!debug)
	scene.add(players[opt.id].model);

	/*if(opt.m < anim_model){
		players[opt.id].mixer.clipAction( players[opt.id].model.geometry.animations[ opt.anim ] ).play();
	}*/
	
	
	if(debug){
		var r = 1;
		var c = 0xffff00;
		var s = 6;
		if(opt.m == 0){r = 2; c = 0x0000ff;}; 			// Корабль
		if(opt.m == 1){r = 0.3; c = 0xff0000; s = 4}  	// Ядро
		if(opt.m == 2) r = 1.5;    	// Мышеловка
		if(opt.m == 4) r = 2;   	// Башня
		if(opt.m == 5) {r = 8; c = 0x210000;};    // Взрыв
		if(opt.m == 9) r = 2;   	// Башня
		if(opt.m == 7) r = 1.8;    	// 
		if(opt.m == 10) {r = 0.3; c = 0x3b0054;};    // Ядро
 		
		
		var geometry = new THREE.SphereBufferGeometry( r, s, s );
		var material = new THREE.MeshBasicMaterial( {color: c, wireframe: true} );
		
		players[opt.id].sphere = new THREE.Mesh( geometry, material );
		players[opt.id].sphere.position.set(opt.x, opt.y, opt.z);
		scene.add( players[opt.id].sphere );
	}	
}


// Обновление модели игрока {id:id, x:x, y:y, a:a, m:m, model:model_src[m].skinnedMesh.clone()}
function ReInitPlayer(opt){
	
	players[opt.id].m = opt.m;
	//players[opt.id].anim = opt.anim;
	
	
	scene.remove(players[opt.id].model);	// Удаление предыдущей модели
	
	players[opt.id].model = opt.model;
	players[opt.id].mixer = new THREE.AnimationMixer( opt.model );
	scene.add(players[opt.id].model);	// Добавление обновленной модели игрока
	
	players[opt.id].model.position.x = opt.x;
	players[opt.id].model.position.y = opt.y;
	players[opt.id].model.position.z = 0;
	players[opt.id].model.rotation.z = opt.a;
	
	
	// Запуск первичной анимации
	/*if(opt.m < anim_model){
		players[opt.id].mixer.clipAction( players[opt.id].model.geometry.animations[ opt.anim ] ).play();
	}*/
	
}
window.onresize = function (){
	// 29.11.16
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
}

function initialization(){
	canvas = document.getElementById('canvas');
	canvas.width = canvas.clientWidth; 	// window.innerWidth;
	canvas.height = canvas.clientHeight; // window.innerHeight;
	width = window.innerWidth;
	height = window.innerHeight;
		

	//canvas.addEventListener('mousemove', getMouseCoordinate, false);	// Движение курсора мыши
	canvas.addEventListener('mousedown', mouseDown, false);				// Нажатие клавиш мыши

	
	/*width = canvas.width;
	height = canvas.height;*/
	// Обработка, Сглаживание
	renderer = new THREE.WebGLRenderer({canvas:canvas, antialias: true});
	renderer.setClearColor(0xFFFFFF);	// Фон
	renderer.setSize( window.innerWidth, window.innerHeight );
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(60, width/height, 0.1, 1000);
	camera.position.set(0, 0, 60);	// Камера {x, y, z}
	//camera.lookAt(new THREE.Vector3(0, 0, 0));
	//camera.rotation.set(0, Math.PI/12, Math.PI/18);
	//scene.add( new THREE.AmbientLight( 0x444444 ) );
	
	//var xAxis = new THREE.Vector3(1,0,0);
	//scene.rotateOnAxis( xAxis, Math.PI );
	
	//var xAxis1 = new THREE.Vector3(0,0,1);
	//scene.rotateOnAxis( xAxis1, Math.PI );
	
	
	light = new THREE.AmbientLight(0xFFFFFF, 1.5);
	light.position.set(0, 1000, 2000);
	scene.add(light);
	
	
	var angelTexture = THREE.ImageUtils.loadTexture("map4.jpg");
	/*angelTexture.offset.x = -0.75; 
	angelTexture.offset.y = -0.75;

	angelTexture.repeat.x = 0.25;
	angelTexture.repeat.y = 0.25;  */ 
	
	
	angelMesh = new THREE.Mesh( new THREE.PlaneGeometry(400, 200, 32),
								new THREE.MeshBasicMaterial( { map: angelTexture, wireframe: false } ));
												
	scene.add(angelMesh);
	angelMesh.position.set(0, +10, 0);
	
	

	
	// Система приближения отдаления карты var elem = document.getElementById('container');
	canvas = document.getElementById('canvas');
	
    if (canvas.addEventListener) {
		if ('onwheel' in document) {
		// IE9+, FF17+
		canvas.addEventListener("wheel", onWheel);
		} else if ('onmousewheel' in document) {
		// устаревший вариант события
		canvas.addEventListener("mousewheel", onWheel);
		} else {
		// Firefox < 17
		canvas.addEventListener("MozMousePixelScroll", onWheel);
		}
    } else { // IE8-
		canvas.attachEvent("onmousewheel", onWheel);
    }
	
	
	
	
	engle();	// Запуск Игры
	
}
function engle(){
	requestAnimationFrame( engle );// Циклирует опримизиронанно функцию
	
	// Установка камеры на игрока {x, y, z}
	if(idPlayer != null && players[idPlayer] != null && players[idPlayer].model != null ){
		//camera.position.x = players[idPlayer].x-10;
		//camera.position.y = players[idPlayer].y-10;
		//camera.lookAt(players[idPlayer].x, players[idPlayer].y, 0 );
		
		//players[id].model.position.x
		camera.position.x = players[idPlayer].x;
		camera.position.y = players[idPlayer].y;
		
		//camera.lookAt(players[idPlayer].model);
		
		
		
		//camera.lookAt(players[idPlayer].model.x, players[idPlayer].model.y, 0);
	}

	// Анимация
	var time = clock.getDelta();

	// Обновление структуры (13.10.2016)
	for (var k in players) {
		players[k].mixer.update( time );
	}

	
	//mirrorMesh.rotation.x += 0.5 * Math.PI/180;
	//camera.rotation.x = -Math.PI/2;
	renderer.render(scene, camera);	// Отрисовка сцены	
}

// возвращает cookie с именем name, если есть, если нет, то undefined
function getCookie(name) {
  var matches = document.cookie.match(new RegExp(
    "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
  ));
  return matches ? decodeURIComponent(matches[1]) : undefined;
}

// Устанавливает websocket соединение
function net(data){
	
	document.getElementById("canvas").style.display = "block";	// (?)
	//document.getElementById("debug").style.display = "none";
	websocket = new WebSocket(wsUri, wsProtocol);		// Инициализация WebSocket
	websocket.binaryType = 'arraybuffer';				// Работаем с двоичными данными
	
	// Получение выбранного корабля (17.08.17)
	//m = document.getElementById('model').value;
	var skill = 0;	//data
	
	// Составляем набор бинарных данных для отправки на сервер
	//var nameStr = document.getElementById("name").value; // name имя игрока в поле ввода
	
	nameClient = getCookie("name");
	
	//alert(nameClient);
	
	var nameStr = nameClient;
	
	if(nameStr === nameStr){
		nameStr = "FunPlayer:3";
	}
	
	var nameBinary = str2ab(nameStr);
	var buffer = new ArrayBuffer(49);	// [0] - модель игрока, [1-40] - имя игрока, [41-44]- высота, [45-48]- долгота
	var ctrlData = new DataView(buffer, 0);
	ctrlData.setInt8(0, skill);
	for(var i = 0; i < 20; i++)
		ctrlData.setUint16(i*2+1, nameBinary[i]);
	
	ctrlData.setFloat32(41, latitude);
	ctrlData.setFloat32(45, longitude);
	
	
	
	
	// Спросить у Константина че делать с hash (15:12 14.10.17) (!)
	/*for(var i = 0; i < 80; i++){
		ctrlData.setUint8(41+i, data.hash[i]);
		console.log(data.hash[i]);
	}*/
		
	
	
	
	// Отправка информации об игроке (15:16 14.10.17)
	websocket.onopen = function(e){
		//console.log(nameBinary);
		websocket.send(ctrlData);
	}
	
	
	
	// Получение обработка отправка данных (xx:xx 14.10.17)
	websocket.onmessage = function(e){
		var data = e.data;
		
		var dv = new DataView(data);
		//console.log("data size: "+data.byteLength);
		
		var add = dv.getUint16(0);	// Добавление новых объектов [2 байт]
		var ref = dv.getUint16(2);	// Обновление объектов [2 байт]
		var del = dv.getUint16(4);	// Удаление объектов [2 байт]
		
		//console.log("Добавление: "+ add + " Обновление: "+ ref + " Удаление: "+ del +" Data: "+ data.byteLength);
		// Перебор всех добавленных игроков
		var ind = 6;	// Интератор данных
		var id, x, y, z, a, m, anim;
		var nameplr = null;	// Буфер для имени, имя.
		var bufnameplr = new Uint16Array(20);

		// ADD
		for(var i = 0; i < add; i++){
			id = dv.getInt32(ind +0);		// Индитификатор Игрока
			x = dv.getFloat32(ind +4);		// Координата X
			y = dv.getFloat32(ind +8);
			z = dv.getFloat32(ind +12);
			a = dv.getFloat32(ind +16);		// Угол поворота Unit (полярные координаты Фёдорова)
			
			// other
			m = dv.getUint8(ind +20);		// Номер модели	{ 0:pig, ... }
			anim = dv.getUint8(ind +21);	// Исполняемая анимация модели
			
			ind += 22;
			// Если герой то добавляем имя
			/*if(id < SIZE_PLAYER){
				for(var n = 0; n < 20; n++){
					bufnameplr[n] = dv.getUint16(ind + n*2);
					if(bufnameplr[n] == 0) bufnameplr[n] = 32;
					//console.log('['+n+']: '+bufnameplr[n]);
				}
				nameplr = ab2str(bufnameplr);
				ind += 40;	// ind:74
				
				//console.log("Получено имя: "+nameplr);
			}*/
			
			
			NewPlayer( {id:id, model:model_src[m].skinnedMesh.clone(), x:x, y:y, z:z, a:a, m:m, anim:anim, name:nameplr} );
			
			//console.log("id: "+id+" model: "+ m +" anim: " +anim+ " x: "+ x + " y: "+ y+ " z: "+ z + " a:"+ a);
		}
		// Перебор всех обновляемых игроков
		var refn;
		for(var i = 0; i < ref; i++){
			refn = dv.getUint8(ind +0);	//[0+1]
			id = dv.getInt32(ind +1);	//[1+4]
			
			if(players[id] == null) continue;
			
			// Обновление (1): move: {refn(1),id(4),x(4),y(4),z(4),a(4),anim(1)} size: 22
			if(refn == 1){
				x = dv.getFloat32(ind +5);		//[5-9]
				y = dv.getFloat32(ind +9);		//[9-13]
				z = dv.getFloat32(ind +13);		//[13-17]
				a = dv.getFloat32(ind +17);		//[17-21]
				m = dv.getUint8(ind +21);	//[21-22]
				anim = dv.getUint8(ind +21);	//[22-23]
				ind += 23;
				
				players[id].x = x;
				players[id].y = y;
				players[id].z = z;
				players[id].a = a;
				players[id].model.position.x = x;
				players[id].model.position.y = y;
				
				players[id].model.rotation.z = a;
				
				// Эффект дрожания
				if(players[id].m == 0)
					players[id].model.rotation.y = z*Math.PI/180;
				else 
					players[id].model.position.z = z;
					
				
				//if(players[id].m < 3) players[id].text.setPosition(x, y);
				
				//console.log("x: "+x+" y: "+y+" a:"+a);
				//console.log("anim: "+anim);
				
				// Debug
				if(debug){
					players[id].sphere.position.x = x;
					players[id].sphere.position.y = y;
					
					//var cubeAxis = new THREE.AxisHelper(20);
					//players[id].model.add(new THREE.AxisHelper(20));
					
				}
				
				if(players[id].m != m)
					ReInitPlayer({id:id, x:x, y:y, a:a, m:m, model:model_src[m].skinnedMesh.clone()});
				
				
				// Если эта анимация уже запущенна то прерываем интерацию
				/*if(players[id].mixer.clipAction( players[id].model.geometry.animations[ anim ] ).isRunning())
					continue;
				for(var j = players[id].model.geometry.animations.length; j--;)
					players[id].mixer.clipAction( players[id].model.geometry.animations[ j ] ).stop();
				players[id].mixer.clipAction( players[id].model.geometry.animations[ anim ] ).play();
				*/
				
				continue;
			}
		}
			
		
		
		// Удаление объектов с карты (удаление отключенных игроков) (13.10.2016)
		for(var i = 0; i < del; i++){
			id = dv.getInt32(ind);
			// Удаление элемента со сцены
			//if(players[id] != null && id < SIZE_PLAYER) players[id].text.delete();
			
			if(players[id] != null)
				scene.remove(players[id].model);
			
			//if(players[id].sphere != null && debug) scene.remove(players[id].sphere);
			
			delete players[id];
			ind += 4;
			/*console.log("Добавление: "+ add + " Обновление: "+ ref + " Удаление: "+ del +" Data: "+ data.byteLength);
			console.log("Удален: "+id);
			console.log("Осталось игроков: "+Object.keys(players).length);*/
		}
		
		
		// Для определения индитификатора игрока
		if (idPlayer == null){
			idPlayer = dv.getInt32(ind);
			ind += 4;
		}
		
		
		//[(uint8)1,(uint8)1,(float)4,(float)4]
		// [0] событие (резерв)
		// [1] действие мыши	0: нет действий; 1:click мыши/экран
		// [2-5] x мыши/экран
		// [6-9] y мыши/экран
		
		// Если есть нет нажатие мыши (28.11.16)
		var buffer; // Собирает промежуточные данные о нажатии
		var ctrlData;
		buffer = new ArrayBuffer(10);
		ctrlData = new DataView(buffer, 0);
		
		
		ctrlData.setUint8(0, ctrl[0]);
		ctrlData.setUint8(1, ctrl[1]);
		ctrlData.setFloat32(2, mouse[0] );	// mouseX
		ctrlData.setFloat32(6, mouse[1] );	// mouseY
		
		
		
		websocket.send(ctrlData);
		
		ctrl[0] = 0;
		ctrl[1] = 0;
		mouse[0] = 0.0;
		mouse[1] = 0.0;
	}
	
	websocket.onclose = function (event) {
        var reason;
        if (event.code == 1000)
            reason = "Normal closure, meaning that the purpose for which the connection was established has been fulfilled.";
        else if(event.code == 1001)
            reason = "An endpoint is \"going away\", such as a server going down or a browser having navigated away from a page.";
        else if(event.code == 1002)
            reason = "An endpoint is terminating the connection due to a protocol error";
        else if(event.code == 1003)
            reason = "An endpoint is terminating the connection because it has received a type of data it cannot accept (e.g., an endpoint that understands only text data MAY send this if it receives a binary message).";
        else if(event.code == 1004)
            reason = "Reserved. The specific meaning might be defined in the future.";
        else if(event.code == 1005)
            reason = "No status code was actually present.";
        else if(event.code == 1006)
           reason = "The connection was closed abnormally, e.g., without sending or receiving a Close control frame";
        else if(event.code == 1007)
            reason = "An endpoint is terminating the connection because it has received data within a message that was not consistent with the type of the message (e.g., non-UTF-8 [http://tools.ietf.org/html/rfc3629] data within a text message).";
        else if(event.code == 1008)
            reason = "An endpoint is terminating the connection because it has received a message that \"violates its policy\". This reason is given either if there is no other sutible reason, or if there is a need to hide specific details about the policy.";
        else if(event.code == 1009)
           reason = "An endpoint is terminating the connection because it has received a message that is too big for it to process.";
        else if(event.code == 1010) // Note that this status code is not used by the server, because it can fail the WebSocket handshake instead.
            reason = "An endpoint (client) is terminating the connection because it has expected the server to negotiate one or more extension, but the server didn't return them in the response message of the WebSocket handshake. <br /> Specifically, the extensions that are needed are: " + event.reason;
        else if(event.code == 1011)
            reason = "A server is terminating the connection because it encountered an unexpected condition that prevented it from fulfilling the request.";
        else if(event.code == 1015)
            reason = "The connection was closed due to a failure to perform a TLS handshake (e.g., the server certificate can't be verified).";
        else
            reason = "Unknown reason";

        console.log("Закрытие Websocket: "+reason);
    };

	
	
}
// Определение нажатой кнопки на мыши (21.07.17)
function mouseDown(e) {
	if (e.which == 1){
		ctrl[1] = 1;
		
		// Получение координат относитьельно браузера
		mouseX = (event.clientX - canvas.offsetLeft - canvas.width/2);
		mouseY = -(event.clientY - canvas.offsetTop - canvas.height/2);
		
		var vector = new THREE.Vector3();
		vector.set(
			( event.clientX / window.innerWidth ) * 2 - 1,
			- ( event.clientY / window.innerHeight ) * 2 + 1,
			0.5 );
		vector.unproject( camera );

		var dir = vector.sub( camera.position ).normalize();

		var distance = - camera.position.z / dir.z;

		var pos = camera.position.clone().add( dir.multiplyScalar( distance ) );
		
		mouse[0] = vector.x;	// vector.x для получения локальной координаты
		mouse[1] = vector.y;	// vector.y для получения локальной координаты
		
		
		
		//console.log("mouse x:"+mouse[0]+ " y:"+mouse[1]);
	}
};


// Получение кординат мыши
function getMouseCoordinate(event){
	
	// Получение координат относитьельно браузера
	mouseX = (event.clientX - canvas.offsetLeft - canvas.width/2);
	mouseY = -(event.clientY - canvas.offsetTop - canvas.height/2);
	
	var vector = new THREE.Vector3();
	vector.set(
		( event.clientX / window.innerWidth ) * 2 - 1,
		- ( event.clientY / window.innerHeight ) * 2 + 1,
		0.5 );
	vector.unproject( camera );

	var dir = vector.sub( camera.position ).normalize();

	var distance = - camera.position.z / dir.z;

	var pos = camera.position.clone().add( dir.multiplyScalar( distance ) );
	
	mouse[0] = vector.x;	// vector.x для получения локальной координаты
	mouse[1] = vector.y;	// vector.y для получения локальной координаты
	
};


// Не используеться (21.07.17)
function mouseMove(evt) {
	
	mouseX = (evt.pageX - canvas.offsetLeft - width/2);
	mouseY = -(evt.pageY - canvas.offsetTop - height/2);
	
	//console.log(mouseX+":"+mouseY+"["+camera.position.z+"]");
}
function Normalize(vec){
	var dis = Math.sqrt(vec.x*vec.x + vec.y*vec.y);	// Дистанция вектора
	var nVec = new Vec(vec.x / dis, vec.y / dis);
	return nVec;
}


// Отдалить/приблизить карту
function onWheel(e) {
	e = e || window.event;

	// deltaY, detail содержат пиксели
	// wheelDelta не дает возможность узнать количество пикселей
	// onwheel || MozMousePixelScroll || onmousewheel
	var delta = e.deltaY || e.detail || e.wheelDelta;


	delta > 0 ? camera.position.z++ : camera.position.z--;

	if(camera.position.z > 80) camera.position.z = 80;
	if(camera.position.z < 30) camera.position.z = 30;


	e.preventDefault ? e.preventDefault() : (e.returnValue = false);
}

// Случайные целые числа
function randomInteger(min, max) {
	var rand = min + Math.random() * (max + 1 - min);
	rand = Math.floor(rand);
	return rand;
}
// Корректировка функций
document.oncontextmenu=function(e){return false};
document.ondrag=function(e){return false};
document.ondragdrop=function(e){return false};
document.ondragstart=function(e){return false};
  