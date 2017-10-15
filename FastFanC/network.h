#define MAX_ECHO_PAYLOAD 32768

struct lws_context *context;


int AddAllData(Player* plr) {

	// Не в игре
	if (units[plr->id].status == 0) {
		return -1;
	}
	uint16 add = 0;
	uint16 ref = 0;
	uint16 del = 0;

	int32 size = 6;			// Кол-во данных передаваемых клиенту (6 - размер информационных данных)
	register int ind = 0;	// Итератор заполнения буфера

	byte* buffer;			// Ссылка на память для передачи

	// Любой Unit - новый
	for (int i = 0; i < SIZE_UNIT; i++) {
		if (units[i].id != -1) {
			add++;
			size += 22; // Байт данных, все данные: {id(4),x(4),y(4),z(4),a(4),model(1),anim(1)}
		}
	}

	// Зерезервировать память для id игрока [data]+4
	size += sizeof(int32);


	// Выделение памяти
	buffer = (byte*)malloc(LWS_PRE + size);

	// Запись информационных данных
	setUint16(&buffer[LWS_PRE + ind], add);
	ind += sizeof(uint16);	// 2 байт
	setUint16(&buffer[LWS_PRE + ind], ref);
	ind += sizeof(uint16);	// 4 байт
	setUint16(&buffer[LWS_PRE + ind], del);
	ind += sizeof(uint16);	// 6 байт


	// Заполнение памяти
	for (int i = 0; i < SIZE_UNIT; i++) {
		// Добавить данные
		if ((units[i].status == 1 || units[i].status == 2) && units[i].id != -1) {
			setInt32(&buffer[LWS_PRE + ind], units[i].id);
			ind += sizeof(int32);	// 4 байт
			setFloat(&buffer[LWS_PRE + ind], units[i].x);
			ind += sizeof(float);	// 8 байт
			setFloat(&buffer[LWS_PRE + ind], units[i].y);
			ind += sizeof(float);	// 12 байт
			setFloat(&buffer[LWS_PRE + ind], units[i].z);
			ind += sizeof(float);	// 16 байт
			setFloat(&buffer[LWS_PRE + ind], units[i].a);
			ind += sizeof(float);	// 20 байт
									// Добавление номера модели:
			setUint8(&buffer[LWS_PRE + ind], units[i].model);
			ind += sizeof(uint8);	// 21 байт

			setUint8(&buffer[LWS_PRE + ind], units[i].anim);
			ind += sizeof(uint8);	// 22 байт
		}
	}

	// Добавление id в конец байт массива
	setInt32(&buffer[LWS_PRE + ind], plr->id);
	ind += sizeof(int32);	// 4 байт


	// Больше не новый игрок
	units[plr->id].status = 2;
	


	int m = lws_write(plr->wsi, &buffer[LWS_PRE], size, LWS_WRITE_BINARY);
	if (m < size) {
		wprintf(L"ERROR: данных отправленно меньше сформированных [%i/%i]\n", m, size);
		// Нужно отключать
		lws_callback_on_writable(plr->wsi); // Провоцирует калбек отключение
	}

	free(buffer);

	return size;
}


// Отправка данных
int32 SendData(Player* plr) {

	// Не в игре
	if (units[plr->id].status == 0) {
		return -1;
	}


	uint16 add = 0;
	uint16 ref = 0;
	uint16 del = 0;

	int32 size = 6;			// Кол-во данных передаваемых клиенту (6 - размер информационных данных)
	register int ind = 0;	// Итератор заполнения буфера

	byte* buffer;			// Ссылка на память для передачи

	int it = 0;
	for (int i = 0; i < SIZE_UNIT; i++) {

		// Игрок подключаеться необходимо создать юнита
		if (units[i].status == 1) {
			add++;
			size += 22; // Байт данных, все данные: {id(4),x(4),y(4),z(4),a(4),model(1),anim(1)}	
			//printf("add\n");
		}


		if (units[i].refn != 0 && units[i].status == 2) {
			if (units[i].refn == 1) {
				ref++;
				size += 23; // Обновление (1): move: {refn(1),id(4),x(4),y(4),z(4),a(4),model(1),anim(1)} size: 23
				//printf("ref\n");
			}

		}


		if (units[i].status == 3) {
			del++;
			size += sizeof(int32);
			//printf("del\n");
		}
	}

	// Проверка отключившехся 2.0
	for (int i = 0; i < SIZE_PLAYER; i++) {
		if (del_array[i] != -1) {
			del++;
			size += sizeof(int32);
		}
	}
	




	// Выделение памяти
	buffer = (byte*)malloc(LWS_PRE + size);
	// Запись информационных данных
	setUint16(&buffer[LWS_PRE + ind], add);
	ind += sizeof(uint16);	// 2 байт
	setUint16(&buffer[LWS_PRE + ind], ref);
	ind += sizeof(uint16);	// 4 байт
	setUint16(&buffer[LWS_PRE + ind], del);
	ind += sizeof(uint16);	// 6 байт

	// ADD
	for (int i = 0; i < SIZE_UNIT; i++) {
		// Добавить данные
		if (units[i].status == 1) {
			setInt32(&buffer[LWS_PRE + ind], units[i].id);
			ind += sizeof(int32);	// 4 байт
			setFloat(&buffer[LWS_PRE + ind], units[i].x);
			ind += sizeof(float);	// 8 байт
			setFloat(&buffer[LWS_PRE + ind], units[i].y);
			ind += sizeof(float);	// 12 байт
			setFloat(&buffer[LWS_PRE + ind], units[i].z);
			ind += sizeof(float);	// 16 байт
			setFloat(&buffer[LWS_PRE + ind], units[i].a);
			ind += sizeof(float);	// 20 байт
			// Добавление номера модели:
			setUint8(&buffer[LWS_PRE + ind], units[i].model);
			ind += sizeof(uint8);	// 21 байт

			setUint8(&buffer[LWS_PRE + ind], units[i].anim);
			ind += sizeof(uint8);	// 22 байт
		}
	}

	// REF
	for (int i = 0; i < SIZE_UNIT; i++) {
		if (units[i].refn != 0 && units[i].status == 2) {
			// Обновление (1): move: {refn(1),id(4),x(4),y(4),z(4),a(4),model(1),anim(1)} size: 23
			if (units[i].refn == 1) {
				setUint8(&buffer[LWS_PRE + ind], units[i].refn);
				ind += sizeof(uint8);	// 1

				setInt32(&buffer[LWS_PRE + ind], units[i].id);
				ind += sizeof(int32);	// 5 байт
				setFloat(&buffer[LWS_PRE + ind], units[i].x);
				ind += sizeof(float);	// 9 байт
				setFloat(&buffer[LWS_PRE + ind], units[i].y);
				ind += sizeof(float);	// 13 байт
				setFloat(&buffer[LWS_PRE + ind], units[i].z);
				ind += sizeof(float);	// 17 байт
				setFloat(&buffer[LWS_PRE + ind], units[i].a);
				ind += sizeof(float);	// 21 байт

				// Изменение модели
				setUint8(&buffer[LWS_PRE + ind], units[i].model);
				ind += sizeof(uint8);	// 22

				// Добавление анимации модели: (резерв)
				setUint8(&buffer[LWS_PRE + ind], units[i].anim);
				ind += sizeof(uint8);	// 22
			}

		}

	}

	// DEL
	for (int i = 0; i < SIZE_UNIT; i++) {
		if (del_array[i] != -1) {
			setInt32(&buffer[LWS_PRE + ind], del_array[i]);
			ind += sizeof(int32);
		}
	}
	for (int i = 0; i < SIZE_UNIT; i++) {
		if (units[i].status == 3) {
			setInt32(&buffer[LWS_PRE + ind], del_array[i]);
			ind += sizeof(int32);
		}
	}
	
	


	//wprintf(L"Сформированно данных для plr[%i]: [%i/%i]\n", plr.list->unit->id, ind, size);
	//Отправка данных (ПРОВЕРИТЬ размер отправляемых данных)
	int m = lws_write(plr->wsi, &buffer[LWS_PRE], size, LWS_WRITE_BINARY);
	if (m < size) {
		wprintf(L"ERROR: данных отправленно меньше сформированных [%i/%i]\n", m, size);
		// Нужно отключать
		lws_callback_on_writable(plr->wsi); // Провоцирует калбек отключение
	}

	free(buffer);

	return size;
}



int callback_wsapi(struct lws *wsi, enum lws_callback_reasons reason, void *user, void *in, size_t len)
{
	int32* id = (int32*)user;


	// (!) Проблемы "висящих" соединений
	switch (reason) {

		// Новое подключение
		case LWS_CALLBACK_ESTABLISHED:
		{
			wprintf(L"Игрок подключен\n");
			*id = -1;
			


			// Определение ip:port подключившегося
			char data_ip[80];
			lws_get_peer_simple(wsi, data_ip, sizeof(data_ip));
			printf("Подключен {%s}\n", data_ip);

			break;
		}

		// Данные от клиента
		case LWS_CALLBACK_RECEIVE:
		{
			char hach[80];
			memset(&hach, '\0', 80);

			// Первичные данные: {[0-39] - имя игрока (utf16 be), [40] - модель игрока, [41-44]- высота, [45-48]- долгота} size: 49 byte
			if (len == 49) {

				// Определение свободного индекса юнита
				
				for (int i = 0; i < SIZE_PLAYER; i++) {
					if (players[i].id == -1) {
						*id = i;
						break;
					}
				}

				if (*id < 0) {
					wprintf(L"Предел подключений: %i\n", SIZE_PLAYER);
					lws_callback_on_writable(wsi); // Провоцирует калбек отключение
					lws_close_reason(wsi, LWS_CLOSE_STATUS_UNEXPECTED_CONDITION, NULL, 0);
					break;
				}

				units[*id].id = *id;
				units[*id].status = 0;	// Подключение

				players[*id].id = *id;
				players[*id].wsi = wsi;

				//wprintf(L"id: %i\n", *id);


				uint8 skill = ((byte*)in)[41];

				//wprintf(L"skill %i\n", skill);


				char name_src[41];
				wchar_t name[21];

				getNameUTF16((byte*)in, name);
				//getNameBytes((byte*)in, name_src);

				
				byte lw[4];	// Высота
				byte lh[4];	// Долгота

				lw[0] = ((byte*)in)[44];
				lw[1] = ((byte*)in)[43];
				lw[2] = ((byte*)in)[42];
				lw[3] = ((byte*)in)[41];

				lh[0] = ((byte*)in)[48];
				lh[1] = ((byte*)in)[47];
				lh[2] = ((byte*)in)[46];
				lh[3] = ((byte*)in)[45];

				float latitude;		// Высота => y Принадлежит интервалу (-90, 90)
				float longitude;	// Долгота => x	Принадлежит интервалу (-180, 180)
				getFloat(lw, &latitude);
				getFloat(lh, &longitude);

				// Если не дали согласия на геолокацию
				if ( isnan(latitude) || isnan(longitude) ) {
					latitude = randomFloat(-90.0f, 90.0f);
					longitude = randomFloat(-180.0f, 180.0f);
				}

				// Если не корректные данные
				if (latitude < -90.0f || latitude > 90.0f) {
					latitude = randomFloat(-90.0f, 90.0f);
					longitude = randomFloat(-180.0f, 180.0f);
				}

				// Если не корректные данные
				if (longitude < -180.0f || longitude > 180.0f) {
					latitude = randomFloat(-90.0f, 90.0f);
					longitude = randomFloat(-180.0f, 180.0f);
				}
					


				//wprintf(L"Высота: %f  Долгота: %f\n", latitude, longitude);

				//memcpy(name, (wchar_t*)in, 40);	// Определение имени игрока
				//wprintf(L"Name player: %ls \n", name);

				//wprintf(L"name: %ls\n", name);

				//wprintf(L"Пришли данные о игроке size: %i\n", len);
				//memcpy(hach, &(in[41]), 80);	// Ох лучше бы на С++ писал

				// инит юнит
				units[*id].x = longitude;
				units[*id].y = latitude;
				units[*id].z = 0.0f;
				units[*id].dz = 0.0f;
				units[*id].r = 3.0f;
				units[*id].a = 0.0f;
				units[*id].nvXs = 0.0f;
				units[*id].nvYs = 0.0f;
				units[*id].anim = 0;
				units[*id].status = 1;	// Подключение но не инициализирован
				units[*id].active = 0;

				units[*id].model = 0;

				units[*id].exp = 0;
				units[*id].score = 0;
				


				break;
			}

			// Прием данных (12:19 14.10.17)
			if (len == 10) {
				byte data[10] = { 0 };

				//memcpy(data, (byte*)in, 10);

				data[0] = ((byte*)in)[0];
				data[1] = ((byte*)in)[1];

				data[2] = ((byte*)in)[5];
				data[3] = ((byte*)in)[4];
				data[4] = ((byte*)in)[3];
				data[5] = ((byte*)in)[2];

				data[6] = ((byte*)in)[9];
				data[7] = ((byte*)in)[8];
				data[8] = ((byte*)in)[7];
				data[9] = ((byte*)in)[6];



				//wprintf(L"data[0]: {%u}\n", data[0]);
				//wprintf(L"data[1]: {%u}\n", data[1]);

				// Если происходит click
				if (data[1] == 1) {
					float mX, mY;
					getFloat(&data[2], &mX);	// Подправить
					getFloat(&data[6], &mY);

					wprintf(L"Координаты: {%f, %f}\n", mX, mY);

					// Установка угла поворота
					// Вектор направления нажатия
					float vXs = mX;// - units[*id].x;
					float vYs = mY;// -units[*id].y;
					

					
					float dis;
					dis = sqrtf(vXs*vXs + vYs*vYs);	// Находи дистанцию

					float angleCos;
					angleCos = vYs / dis;	// cos φ

					// если в точка в 1,4 четверти то +, если во 2,3 то -
					float angle;
					angle = acosf(angleCos);
					
					if(vXs > 0) {
						angle = -acosf(angleCos);
					}
					else if (vXs < 0 ){
						angle = acosf(angleCos);
					}else {
						angle = 0.0f;
					}


					units[*id].a = angle;
					units[*id].active = 1;

					units[*id].refn = 1;	// Обновление модели
				}
				break;
			}


			wprintf(L"miss\n");
			lws_callback_on_writable(wsi); // Провоцирует калбек отключение

			break;
		}
		// Перехват отключения Игрока (Когда WebSocket завершает сеанс)
		case LWS_CALLBACK_CLOSED:
		{
			if (*id < 0) break;

			// Определение свободной ячейки для удаления
			for (int i = 0; i < SIZE_PLAYER; i++) {
				if (del_array[i] == -1) {
					del_array[i] = *id;
					wprintf(L"Добавленно в массив удаления: %i\n", del_array[i]);
					break;
				}
			}

			units[*id].id = -1;
			units[*id].status = 4;	// Подключение (?)
			players[*id].id = -1;

			break;
		}

		// Отложенный вызов отправки данных (можно использовать для конечного прихлопывания клиента юзать вроде как)
		case LWS_CALLBACK_SERVER_WRITEABLE: {

			if (*id < 0) break;

			// Определение свободной ячейки для удаления
			for (int i = 0; i < SIZE_PLAYER; i++) {
				if (del_array[i] == -1) {
					del_array[i] = *id;
					wprintf(L"(!)Добавленно в массив удаления: %i\n", del_array[i]);
					break;
				}
			}

			units[*id].id = -1;
			units[*id].status = 4;	// Подключение (?)
			players[*id].id = -1;

			break;
		}

		default:
			break;
		}
	

	return 0;
}

// Протокол данных
static struct lws_protocols protocols[] = {
	{
		"fast-fun",			// Протокол приема данных
		callback_wsapi,		// Функция колбек обработчик (это имя главной функции, которая получает запрос клиент)
		sizeof(int32*),		// Размер сессии (скорее всего размер user) (Размер структуры данных, которая будет содержать данные сессии)
		MAX_ECHO_PAYLOAD,	// Максимальный буфер данных доступный для сокета
	},

	// Без данного протокола вылетает (?)
	{ NULL, NULL, 0, 0 } /* terminator */
};

// Информация о конфигурации сервера
struct lws_context_creation_info InitInfo(int port) {
	struct lws_context_creation_info info;
	memset(&info, 0, sizeof(info));	// Избавление от мусора (обнуление структуры)
	info.port = port;	// Порт приложения
	info.iface = NULL;	// Связь сокета для интерфейса (?)
	info.protocols = protocols;	// протокол передачи данных
	info.extensions = NULL;	// Массив lws_extension которых перечислены Структуры расширений
	info.ssl_cert_filepath = NULL;	// Если хотим использовать SSL шифрование
	info.ssl_private_key_filepath = NULL;	// Разрешение на установку закрытого ключа
	info.gid = -1;	// Индетификатор группы или -1
	info.uid = -1;	// Индетификатор пользователя или -1
	info.max_http_header_pool = 1;	// ?
	info.timeout_secs = 1;
	info.options = 0; // Опции

	return info;
}