#include <math.h>

#define SIZE_P 100
#define SIZE_U 3000

typedef unsigned char byte;
typedef unsigned char uint8;
typedef char int8;
typedef unsigned short int uint16;
typedef short int int16;
typedef unsigned long int uint32;
typedef long int int32;

const float PI = 3.142857f;

const int32 rps = 1000 / 60;	// Чистого фана в секунду

const int32 SIZE_PLAYER = SIZE_P;
const int32 SIZE_UNIT = SIZE_U;

const float MAP_WIDTH = 180.0f;
const float MAP_HEIGHT = 90.0f;

const float RADIUS = 50.0f;				// Поле зрение игрока (?)


const uint8 PIG_MODEL = 0;
const uint8 DOG_MODEL = 1;
const uint8 THREE_MODEL = 2;

const float PIG_SPEED = 0.5f;
// ..

const float SPEED_PORATION = 0.068f;	// Я хз сколько это градусов но вроде пойдет (спросить дизайнера как он доедет!)
// ..

const float PIG_RADIUS = 3.0f;
// ..


// Основные типы данных

// 36 байт (?)
typedef struct unit_t
{
	int32 id;	// Индитификатор объекта(send byte = 4)
	float x;	// Координата x Игрока	(send byte = 4)
	float y;	// Координата y Игрока	(send byte = 4)
	float z;	// Координата z Игрока	(send byte = 4)
	float dz;	// Пройденный путь 	(no send)
	float a;	// Угол поворота Игрока	(send byte = 4)
	float r;    // Радиус столкновления объекта (no send)
	uint8 model;// Номер модели Игрока	(send  byte = 1)
	uint8 anim;	// Номер исполняемой модели	(send  byte = 1)

	uint32 exp;		// Опыт
	uint32 score;	// Счет


	uint8 active;	// Действия игрока {0:стоият на месте; 1:движение прямо;2...}

	float nvXs; // Нормализированный вектор X
	float nvYs; // Нормализированный вектор Y

	uint8 status;	//  0 игрок не в игре; 1: игрок подключился; 2: игрок в игре; 3: игрок отключился; (no send)
	uint8 refn;		// Определяет что обновилось (send byte = 1)
} Unit;

// ?? байт
typedef struct player_t
{
	struct lws* wsi;	// ссылка на подключение игрока
	int32 id;			// Индитификатор игрока	(совпадает с индексом с массиве как игрока так и объекта)
	wchar_t name[21];	// имя игрока 42 байта 
	//List* list;		// Времени маловато врятли успеем((
} Player;

Unit units[SIZE_U];
Player players[SIZE_P];
int32 del_array[SIZE_U];	// Массив удаления объектов


float randomFloat(float min, float max) {
	return (float)rand() / RAND_MAX * (max - min) + min;
}


// Конвертация типов // Иисусец котец и святая дева котия дай мне сил! //
// Стандарт функции (15:23 14.10.17)
void setFloat(byte* buffer, float a) {
	memcpy(buffer, &a, sizeof(float));
	byte tmp = buffer[0];
	buffer[0] = buffer[3];
	buffer[3] = tmp;
	tmp = buffer[1];
	buffer[1] = buffer[2];
	buffer[2] = tmp;
}

void getFloat(const byte* buffer, float* a) {
	memcpy(a, buffer, sizeof(float));
}

void setInt32(byte* buffer, int32 a) {
	memcpy(buffer, &a, sizeof(int32));
	byte tmp = buffer[0];
	buffer[0] = buffer[3];
	buffer[3] = tmp;
	tmp = buffer[1];
	buffer[1] = buffer[2];
	buffer[2] = tmp;
}

void getInt32(const byte* buffer, int32* a) {
	memcpy(a, buffer, sizeof(int32));
}

// Запись и считывание с буффера данных 
void setUint32(byte* buffer, uint32 a) {
	memcpy(buffer, &a, sizeof(uint32));
	// Переворачиваем массив
	byte tmp = buffer[0];
	buffer[0] = buffer[3];
	buffer[3] = tmp;
	tmp = buffer[1];
	buffer[1] = buffer[2];
	buffer[2] = tmp;
}
void getUint32(const byte* buffer, uint32* a) {
	memcpy(a, buffer, sizeof(uint32));
}


void setUint16(byte* buffer, uint16 a) {
	memcpy(buffer, &a, sizeof(uint16));
	byte tmp = buffer[0];
	buffer[0] = buffer[1];
	buffer[1] = tmp;
}

void getUint16(byte* buffer, uint16* a) {
	memcpy(a, buffer, sizeof(uint16));
}

// Для однобайтового массива (16.08.17)
void setUint8(byte* buffer, uint8 a) {
	memcpy(buffer, &a, sizeof(uint8));
}

void getUint8(byte* buffer, uint8* a) {
	memcpy(a, buffer, sizeof(uint8));
}

void setString(byte* buffer, wchar_t* str, int len) {	// len = 40! Сказать Дмитрию, или Константину хз кто из них кто
	memcpy(buffer, str, len);
	/*byte ch;
	for (int c = 0; c < 40; c += 2) {
	ch = buffer[c];
	buffer[c] = buffer[c + 1];
	buffer[c + 1] = ch;
	}*/
}

void setNameBytes(byte* buffer, char* str, int len) {
	memcpy(buffer, str, len);
	/*byte ch;
	for (int c = 0; c < 40; c += 2) {
	ch = buffer[c];
	buffer[c] = buffer[c + 1];
	buffer[c + 1] = ch;
	}*/
}

void getNameUTF16(byte* buffer, wchar_t* str) {

	byte arr[40];
	for (int c = 0; c < 40; c++)
		arr[c] = (buffer)[c + 1];


	byte ch;
	for (int c = 0; c < 40; c += 2) {
		ch = arr[c];
		arr[c] = arr[c + 1];
		arr[c + 1] = ch;
	}
	memcpy(str, arr, 40);
	str[20] = L'\0';
}

void getNameBytes(byte* buffer, char* str) {

	byte arr[40];
	for (int c = 0; c < 40; c++)
		arr[c] = (buffer)[c + 1];

	byte ch;
	for (int c = 0; c < 40; c += 2) {
		ch = arr[c];
		arr[c] = arr[c + 1];
		arr[c + 1] = ch;
	}
	memcpy(str, arr, 40);
	str[40] = '\0';
}