# Guía global: NestJS + TypeORM para el parcial

Esta guía explica **paso a paso** cómo se resolvió el taller del hotel (`taller_hotel_2h_nest_2025B`) y,
sobre todo, **cómo repetir el mismo método** en un parcial parecido con otro dominio
(biblioteca, tienda, clínica, etc.). Todo lo que aparece aquí fue probado: `npm test` (36 pruebas
unitarias) y `npm run test:e2e` (33 pruebas e2e) pasan, y además se probó la API a mano con `curl`.

> Los comentarios `[TALLER]`, `[BUG n - CORREGIDO]` y `[IMPORTANTE]` dentro del código marcan los
> lugares clave. Léelos junto con esta guía.

---

## Índice

1. [El modelo mental](#1-el-modelo-mental)
2. [Estructura del proyecto](#2-estructura-del-proyecto)
3. [Plan de ataque para las 2 horas](#3-plan-de-ataque-para-las-2-horas)
4. [Setup y comandos](#4-setup-y-comandos)
5. [Paso 1: leer los tests antes de programar](#5-paso-1-leer-los-tests-antes-de-programar)
6. [Paso 2: los bugs (y cómo cazarlos)](#6-paso-2-los-bugs-y-cómo-cazarlos)
7. [Paso 3: validaciones con DTOs](#7-paso-3-validaciones-con-dtos)
8. [Paso 4: métodos de los services (CRUD)](#8-paso-4-métodos-de-los-services-crud)
9. [Paso 5: endpoints en los controllers](#9-paso-5-endpoints-en-los-controllers)
10. [Reglas de negocio de Booking](#10-reglas-de-negocio-de-booking)
11. [Tabla de excepciones HTTP](#11-tabla-de-excepciones-http)
12. [Cheat sheet de TypeORM](#12-cheat-sheet-de-typeorm)
13. [Errores que aparecieron de verdad](#13-errores-que-aparecieron-de-verdad)
14. [Receta: crear un recurso nuevo desde cero](#14-receta-crear-un-recurso-nuevo-desde-cero)
15. [Checklist final antes de entregar](#15-checklist-final-antes-de-entregar)
16. [Resumen de cambios hechos en este taller](#16-resumen-de-cambios-hechos-en-este-taller)
17. [Mejoras que NO se hicieron](#17-mejoras-que-no-se-hicieron)

---

## 1. El modelo mental

Una petición HTTP atraviesa capas, cada una con **una sola responsabilidad**:

```
Cliente  ──HTTP──►  main.ts (ValidationPipe)  ──►  Controller  ──►  Service  ──►  Repository (TypeORM)  ──►  BD
                    "¿el body es válido?"          "¿qué ruta?"     "reglas de       "SELECT / INSERT /
                     usa los DTO                    extrae params    negocio"         UPDATE / DELETE"
```

| Capa | Archivo | Responsabilidad | NO debe hacer |
|---|---|---|---|
| **DTO** | `dto/create-x.dto.ts` | Describir y validar el body | Lógica de negocio |
| **Entity** | `x.entity.ts` | Definir la tabla y sus relaciones | Lógica |
| **Controller** | `x.controller.ts` | Definir rutas, leer `@Param/@Body/@Query`, llamar al service | Hablar con la BD, reglas de negocio |
| **Service** | `x.service.ts` | Reglas de negocio, lanzar excepciones, usar el repository | Conocer HTTP/rutas |
| **Module** | `x.module.ts` | Conectar controller + service + entidad | — |
| **AppModule** | `app.module.ts` | Importar TODOS los módulos y configurar la BD | — |

**Inyección de dependencias:** el service no hace `new Repository()`. Pide el repositorio en su
constructor con `@InjectRepository(Entidad)` y Nest se lo entrega. Eso solo funciona si el módulo
tiene `TypeOrmModule.forFeature([Entidad])`. Los controllers igual: reciben el service por constructor.

---

## 2. Estructura del proyecto

```
src/
├── main.ts                  # Arranque: ValidationPipe global + listen(3000)
├── app.module.ts            # Raíz: ConfigModule, TypeOrmModule.forRoot, y TODOS los módulos
├── user/                    # Registro de usuarios (bcrypt)
├── hotel/                   # CRUD de hoteles + búsqueda + disponibles
├── room/                    # Habitaciones, anidadas bajo /hotels/:hotelId/rooms
├── booking/                 # Reservas: conflicto de fechas, precio, cancelar
├── auth/                    # JWT (estrategia + módulo). No hay endpoint de login
└── **/*.service.spec.ts     # Tests UNITARIOS (mock del repository)
test/
└── *.e2e-spec.ts            # Tests e2e (app real + supertest)
```

Cada carpeta de recurso sigue **siempre** el mismo molde: `entity`, `dto/`, `service`, `controller`, `module`.

---

## 3. Plan de ataque para las 2 horas

Orden recomendado (de lo que desbloquea más a lo que desbloquea menos):

| Min | Qué hacer | Por qué en ese orden |
|---|---|---|
| 0–10 | `npm install`, `npm run start:dev`, leer errores de arranque | Si la app no arranca, nada más funciona (aquí el bug del `timestamp`) |
| 10–20 | Leer **los tests** y los `// TODO` / `// BUG` con `rg` | Los tests son la especificación exacta (ver §5) |
| 20–35 | Corregir bugs y activar `ValidationPipe` | Son cambios chicos con mucho impacto |
| 35–50 | Validaciones en DTOs | Mecánico y rápido |
| 50–100 | Métodos de services + endpoints | Es lo más largo; ir de lo simple (update/delete) a lo complejo (booking) |
| 100–120 | Correr todos los tests, prueba manual con `curl`, commit y push | No dejes el push para el último minuto |

Para encontrar todo lo pendiente de un golpe (desde la raíz del proyecto, con `rg`):

```bash
rg -n "TODO|BUG|Not implemented" src test
```

---

## 4. Setup y comandos

```bash
npm install            # instala dependencias (la 1ª vez baja el binario de sqlite3)
npm run start:dev      # servidor con recarga automática en http://localhost:3000
npm test               # tests UNITARIOS  (jest, archivos *.spec.ts dentro de src/)
npm run test:e2e       # tests e2e        (jest --config ./test/jest-e2e.json)
npx tsc --noEmit       # solo comprueba tipos, sin generar archivos (útil para ver errores TS rápido)
npx jest src/booking   # correr solo un grupo de tests
```

**Ojo con `npm test`:** el `package.json` solo corre los `*.spec.ts` de `src/`. Los e2e se corren con
`npm run test:e2e`. Corre **ambos** antes de entregar.

Probar a mano (en otra terminal, con la app corriendo):

```bash
curl -X POST localhost:3000/hotels -H "Content-Type: application/json" \
  -d '{"name":"Grand","location":"Downtown","city":"NY","country":"US","rating":4.5}'
curl localhost:3000/hotels/search?location=down
curl -X DELETE localhost:3000/bookings/1
```

---

## 5. Paso 1: leer los tests antes de programar

Los tests dicen **exactamente** qué firma, qué mock y qué resultado se espera. Ejemplos reales de este taller:

**Test unitario de `update`:**
```ts
mockRepository.update.mockResolvedValue({ affected: 1 });
mockRepository.findOne.mockResolvedValue(updatedHotel);
const result = await service.update(1, updateData);
```
→ Deduces: el service debe llamar a `repository.update(...)` y luego a `repository.findOne(...)`.

**Test unitario de `delete`:**
```ts
mockRepository.delete.mockResolvedValue({ affected: 1 });
expect(result).toBe(true);
expect(mockRepository.delete).toHaveBeenCalledWith(1);
```
→ Deduces: usar `repository.delete(id)` (NO `remove`), devolver `true`. Como solo se mockea `delete`
(no `findOne`), el 404 hay que decidirlo con `result.affected === 0`, **no** buscando antes con `findOne`.

**Test unitario de `hasDateConflict`:** mockea `find` (no `count`, no `createQueryBuilder`) →
hay que implementarlo con `repository.find(...)` y comprobar si el arreglo tiene elementos.

**Test e2e de DELETE booking:** espera `body.status === 'cancelled'` → el endpoint devuelve la
reserva actualizada, no `{ success: true }`.

**Regla de oro:** el mock solo tiene los métodos que el test declaró. Si tu service usa otro método
del repository (`count`, `softDelete`...), el test unitario revienta con `x is not a function`.

**Cómo leer los asserts permisivos:** `expect([200, 404]).toContain(res.status)` significa "cualquiera
de los dos pasa". Que el test pase **no** prueba que tu lógica sea correcta; por eso conviene probar a
mano con `curl` los casos importantes.

---

## 6. Paso 2: los bugs (y cómo cazarlos)

El enunciado dice 5 bugs, pero en el código había **más cosas rotas** de las marcadas con `// BUG`.
Lista completa de lo que se encontró y corrigió:

### Los marcados en comentarios

**Bug 1 – `Booking.room` sin cascade** (`booking.entity.ts`)
```ts
// ANTES
@ManyToOne(() => Room, (room) => room.bookings)
// DESPUÉS
@ManyToOne(() => Room, (room) => room.bookings, { onDelete: 'CASCADE' })
```
Sin `onDelete: 'CASCADE'`, borrar una habitación con reservas falla por la llave foránea.
**El `onDelete` siempre va en el lado `@ManyToOne`** (el lado que tiene la columna FK).

**Bug 2 – `User.bookings` sin cascade** (`user.entity.ts`)
```ts
@OneToMany(() => Booking, (booking) => booking.user, { cascade: true })
```
`cascade: true` es una opción de TypeORM (propaga guardados/borrados desde el padre). El borrado
real en la BD lo hace el `onDelete: 'CASCADE'` que `Booking.user` ya tenía. Ambos se complementan.

**Bug 3 – Excepción equivocada en `UserService.create`**
```ts
// ANTES: throw new NotFoundException('Email already in use');   // 404 ✗
// DESPUÉS:
throw new ConflictException('Email already in use');              // 409 ✓
```
El test unitario esperaba `ConflictException` (de hecho ya la importaba sin usarla: **un import sin
usar es una pista**).

**Bug 4 – `roomId` en vez de `room` en `BookingService.create`**
```ts
// ANTES: this.bookingsRepository.create({ ...createBookingDto, roomId: createBookingDto.roomId, ... })
// DESPUÉS:
this.bookingsRepository.create({
  checkInDate, checkOutDate,
  room: { id: createBookingDto.roomId },   // la ENTIDAD tiene la relación `room`, no `roomId`
  user: { id: userId },
  status: 'pending',
  totalPrice,
});
```
Las relaciones se asignan como objeto `{ id }`. Además se quitó el `...createBookingDto` porque
arrastraba `roomId` (que no existe en la entidad) y las fechas como string.

**"Bug" 5 del comentario – `Room.bookings` "sin lado inverso"**: era una **pista falsa**. El código ya
tenía `(booking) => booking.room`, que es el lado inverso correcto. Solo se aclaró el comentario.
Moraleja: verifica cada comentario `BUG` contra el código; no todo lo que dice "bug" lo es.

### Los que NO estaban marcados (los más peligrosos)

**Bug 5 real – `type: 'timestamp'` no existe en SQLite** (las 4 entidades)
La app **ni arrancaba**:
```
DataTypeNotSupportedError: Data type "timestamp" in "Hotel.createdAt" is not supported by "sqlite"
```
Solución portable:
```ts
@CreateDateColumn()
createdAt: Date;
```

**`BookingModule` no estaba en `AppModule`**: el controller y el service estaban perfectos, pero
`/bookings` devolvía 404 porque el módulo nunca se registró. **Todo módulo nuevo debe ir en
`imports` de `AppModule`.**

**`ValidationPipe` no estaba activo en `main.ts`**: todos los decoradores de los DTO eran decoración.
```ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
```

**`findOne`/`findById` declaraban `Promise<User>` pero devuelven `User | null`**: con
`strictNullChecks` TypeScript no compila. Se cambió a `Promise<User | null>` y el controller lanza
`NotFoundException` si es `null` (si no, la API respondía `200` con body vacío).

**Tests e2e:** `import * as request from 'supertest'` no es invocable con `esModuleInterop`
(`request(app...)` falla). Correcto: `import request from 'supertest'`.

### Checklist para cazar bugs en cualquier proyecto Nest

1. ¿Arranca? (`npm run start:dev`) → lee el **primer** error, no el último.
2. ¿Cada módulo nuevo está en `AppModule.imports`?
3. ¿Cada entidad usada por un service está en `forFeature([...])` del módulo que la inyecta?
4. ¿`main.ts` tiene `ValidationPipe`?
5. ¿Los nombres de propiedades coinciden con los de la entidad (`room` vs `roomId`)?
6. ¿La excepción lanzada coincide con lo que el test espera (`Conflict` vs `NotFound`)?
7. ¿Hay imports sin usar? Suelen delatar lo que falta (`ConflictException`, `BadRequestException`).
8. ¿Los tipos de BD son soportados por el driver (`timestamp` vs `datetime`)?
9. ¿`onDelete` está en el lado `ManyToOne`?
10. ¿Rutas fijas (`/search`) declaradas **antes** que dinámicas (`/:id`)? (ver §9)

---

## 7. Paso 3: validaciones con DTOs

Los DTO son **clases** (no interfaces) porque los decoradores necesitan existir en tiempo de ejecución.

### Catálogo de decoradores de `class-validator`

| Decorador | Qué valida | Ejemplo que FALLA |
|---|---|---|
| `@IsNotEmpty()` | No vacío / null / undefined | `""`, `null` |
| `@IsString()` | Es string | `123` |
| `@IsEmail()` | Formato de correo | `"invalid-email"` |
| `@IsNumber()` | Es número | `"abc"` |
| `@IsInt()` | Es entero | `1.5` |
| `@Min(n)` / `@Max(n)` | Rango numérico | `rating: 6.5` con `@Max(5)` |
| `@MinLength(n)` | Longitud mínima de string | `"123"` con `@MinLength(6)` |
| `@IsIn([...])` | Valor dentro de una lista | `"penthouse"` |
| `@IsBoolean()` | Es true/false | `"yes"` |
| `@IsDateString()` | String de fecha ISO | `"mañana"` |
| `@IsOptional()` | Si no viene, se salta las demás validaciones | — |

### Las 12 validaciones del taller

```ts
// CreateUserDto
@IsEmail()                          email: string;
@IsNotEmpty() @MinLength(6)         password: string;
@IsNotEmpty()                       name: string;
@IsOptional() @IsString()           phone?: string;

// CreateHotelDto
@IsNotEmpty() @IsString()           name: string;
@IsNotEmpty() @IsString()           location: string;
@IsNumber() @Min(0) @Max(5)         rating: number;
@IsOptional() @IsString()           city / country / description

// CreateRoomDto
@IsNotEmpty() @IsString()           roomNumber: string;
@IsIn(['single','double','suite'])  type: string;
@IsNumber() @Min(0.01)              pricePerNight: number;
@IsNumber() @Min(1)                 capacity: number;
```

### Por qué TODA propiedad lleva decorador

Con `whitelist: true` Nest **elimina** las propiedades sin ningún decorador; con
`forbidNonWhitelisted: true` responde `400 property x should not exist`. Entonces un campo opcional
sin decorador no se podría enviar nunca. Por eso hasta `phone?` lleva `@IsOptional() @IsString()`.

### DTOs de actualización (PUT)

Un PUT puede mandar solo `{ rating: 4.8 }`, así que necesita las mismas reglas pero **todo opcional**:

```ts
export class UpdateHotelDto {
  @IsOptional() @IsString()                    name?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(5)    rating?: number;
  // ...
}
```

- ✗ **`Partial<CreateHotelDto>` NO valida nada.** Es un tipo de TypeScript que desaparece al
  compilar; Nest ve `Object` y no valida.
- ✓ Lo ideal es `PartialType(CreateHotelDto)` de `@nestjs/mapped-types` (copia los decoradores
  automáticamente). En este proyecto **no funcionó**: `package.json` declara `"@nestjs/mapped-types": "*"`
  y se instaló una versión solo-ESM que Jest no puede cargar (`Must use import to load ES Module`).
  Por eso se escribió a mano. Si en tu parcial ves ese error, haz lo mismo.
- En `UpdateRoomDto` se agregó `available?: boolean` porque existe en la entidad y los tests lo
  envían; sin él `forbidNonWhitelisted` devolvería 400.

### Validaciones que dependen de dos campos

`checkOutDate > checkInDate` compara dos campos, así que se hace en el **service** con
`BadRequestException`, no en el DTO. (Existen validadores personalizados con `@ValidatorConstraint`,
pero son más largos; en 2 horas el `if` del service es más rápido y seguro.)

### Fechas por HTTP

JSON no tiene tipo fecha: llegan como string. Por eso `@IsDateString()` (no `@IsDate()`), y el service
convierte con `new Date(...)`. El tipo del DTO se dejó como `Date` para que los tests unitarios
(que pasan objetos `Date`) compilen.

---

## 8. Paso 4: métodos de los services (CRUD)

### Patrón UPDATE (copiar y pegar)
```ts
async update(id: number, updateData: Partial<CreateHotelDto>): Promise<Hotel> {
  const result = await this.hotelsRepository.update(id, updateData); // 1) UPDATE directo -> { affected }
  if (result.affected === 0) {                                       // 2) ¿existía?
    throw new NotFoundException(`Hotel with id ${id} not found`);
  }
  return this.findOne(id);                                           // 3) releer y devolver
}
```

### Patrón DELETE
```ts
async delete(id: number): Promise<boolean> {
  const result = await this.hotelsRepository.delete(id);
  if (result.affected === 0) {
    throw new NotFoundException(`Hotel with id ${id} not found`);
  }
  return true;
}
```
Los hijos se borran solos por `onDelete: 'CASCADE'` (hotel → rooms → bookings).

### Patrón BÚSQUEDA con LIKE (`searchByLocation`)
```ts
return this.hotelsRepository.find({
  where: [                                   // ARRAY = OR
    { location: Like(`%${location}%`) },
    { city: Like(`%${location}%`) },
  ],
  relations: ['rooms'],
});
```
Un objeto con varias claves es **AND**; un arreglo de objetos es **OR**.

### Patrón filtrar por una relación (`getAvailableHotels`)
```ts
this.hotelsRepository.find({ where: { rooms: { available: true } }, relations: ['rooms'] });
```
Hoteles con al menos una habitación disponible (hace JOIN internamente).

### Habitaciones disponibles de un hotel (`getAvailability`)
```ts
this.roomsRepository.find({ where: { hotel: { id: hotelId }, available: true } });
```

### Disponibilidad por rango de fechas (`isAvailableForDateRange`)
Carga la habitación con `relations: ['bookings']`, devuelve `false` si `!available`, y comprueba si
alguna reserva **no cancelada** se traslapa (fórmula en §10).

### Crear con relación (`RoomService.create`)
```ts
this.roomsRepository.create({ ...createRoomDto, hotel: { id: hotelId } });
```
`hotel: { id }` rellena la FK sin cargar el hotel completo.

### Cancelar (`BookingService.cancel`)
```ts
async cancel(id: number): Promise<Booking> {
  await this.findOne(id);                                      // 404 si no existe
  await this.bookingsRepository.update(id, { status: 'cancelled' });
  return this.findOne(id);                                     // devuelve estado nuevo
}
```
Cancelar **cambia el estado**, no borra la fila (así queda historial).

---

## 9. Paso 5: endpoints en los controllers

### Decoradores esenciales

| Decorador | Uso | Ejemplo |
|---|---|---|
| `@Controller('hotels')` | Prefijo de la clase | `/hotels` |
| `@Get() @Post() @Put() @Delete()` | Método HTTP (+ sub-ruta opcional) | `@Get('search')` |
| `@Param('id')` | Segmento de la URL | `/hotels/5` → `'5'` (**string**) |
| `@Query('location')` | Query string | `?location=Downtown` |
| `@Body()` | Cuerpo JSON (activa validación del DTO) | `@Body() dto: CreateHotelDto` |

Los params llegan como **string** → `parseInt(id)` antes de pasarlos al service.

### ⚠ Orden de rutas (error clásico)

Nest evalúa las rutas **en el orden en que las escribiste**. Si `@Get(':id')` va primero, entonces
`GET /hotels/search` entra a `:id` con `id = "search"` → `parseInt` da `NaN` → error.

```ts
@Get('search')     // rutas FIJAS primero
@Get('available')
@Get(':id')        // dinámica al final
```

### Rutas anidadas
`@Controller('hotels/:hotelId/rooms')` → todos los métodos tienen acceso a `@Param('hotelId')`.

### Mapa completo de endpoints del taller

| Método | Ruta | Qué hace | Éxito | Errores |
|---|---|---|---|---|
| POST | `/users/register` | Registrar usuario | 201 | 400 validación, 409 email repetido |
| GET | `/users` · `/users/:id` | Listar / ver | 200 | 404 si no existe |
| POST | `/hotels` | Crear hotel | 201 | 400 |
| GET | `/hotels` · `/hotels/:id` | Listar / ver | 200 | 404 |
| GET | `/hotels/search?location=` | Buscar por ubicación/ciudad | 200 | — |
| GET | `/hotels/available` | Hoteles con habitaciones libres | 200 | — |
| PUT | `/hotels/:id` | Actualizar | 200 | 400, 404 |
| DELETE | `/hotels/:id` | Borrar | 200 `{success:true}` | 404 |
| POST | `/hotels/:hotelId/rooms` | Crear habitación | 201 | 400 |
| GET | `/hotels/:hotelId/rooms` · `/:id` | Listar / ver | 200 | 404 |
| GET | `/hotels/:hotelId/rooms/available` | Habitaciones libres | 200 | — |
| PUT / DELETE | `/hotels/:hotelId/rooms/:id` | Actualizar / borrar | 200 | 400, 404 |
| POST | `/bookings` | Crear reserva | 201 | 400 fechas/choque, 404 habitación |
| GET | `/bookings/:id` · `/user/:userId` · `/room/:roomId` | Consultar | 200 | 404 |
| DELETE | `/bookings/:id` | **Cancelar** | 200 + reserva `cancelled` | 404 |

---

## 10. Reglas de negocio de Booking

**1. Fechas válidas:** `checkOutDate > checkInDate`, si no → `BadRequestException` (400).

**2. Traslape de fechas.** Dos rangos `[a1, a2)` y `[b1, b2)` se traslapan si y solo si:

```
a1 < b2   Y   a2 > b1
```

Aplicado: `reserva.checkIn < nuevoCheckOut  Y  reserva.checkOut > nuevoCheckIn`.

```ts
where: {
  room: { id: roomId },
  status: Not('cancelled'),                 // las canceladas liberan la habitación
  checkInDate: LessThan(checkOutDate),
  checkOutDate: MoreThan(checkInDate),
}
```

Se usan desigualdades **estrictas** (`<`, `>`): una reserva que termina el 5 y otra que empieza
el 5 **no** chocan (comprobado con curl: la 2ª reserva `5→6 jun` se crea sin problema).

**3. Precio total** = `noches × pricePerNight`:
```ts
const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY);
totalPrice = nights * Number(room.pricePerNight);   // decimal puede llegar como string -> Number()
```
Comprobado: 1→5 jun a 150/noche = **600**.

**4. Habitación inexistente** → `NotFoundException` (si no, la FK fallaría con un 500).

**Detalle de diseño:** `BookingService` recibe `Repository<Room>` con `@Optional()`. Los tests unitarios
solo proveen el repositorio de `Booking`; sin `@Optional()` Nest no podría construir el service en esos
tests. En la app real el `BookingModule` registra `Room` en `forFeature` y siempre llega.

---

## 11. Tabla de excepciones HTTP

Elige la excepción por **significado**, no al azar (los tests suelen comprobarla):

| Excepción (`@nestjs/common`) | Código | Cuándo |
|---|---|---|
| `BadRequestException` | 400 | Datos inválidos / regla de negocio incumplida (fechas, choque) |
| `UnauthorizedException` | 401 | No autenticado |
| `ForbiddenException` | 403 | Autenticado pero sin permiso |
| `NotFoundException` | 404 | El recurso no existe |
| `ConflictException` | 409 | Choca con el estado actual (email ya registrado) |

---

## 12. Cheat sheet de TypeORM

```ts
// Crear (create arma el objeto en memoria; save lo inserta)
const e = repo.create({ ...dto, relacion: { id: 5 } });
await repo.save(e);

// Leer
repo.find()                                              // todos
repo.find({ where: { city: 'NY' }, relations: ['rooms'] })
repo.findOne({ where: { id } })                          // devuelve la entidad o null
repo.find({ where: { room: { id: roomId } } })           // filtrar por relación

// Actualizar / borrar (devuelven { affected })
await repo.update(id, { name: 'X' });
await repo.delete(id);

// Operadores de where
Like('%txt%')  LessThan(x)  MoreThan(x)  Not(x)  Between(a, b)  In([1,2])

// where: objeto = AND   |   arreglo de objetos = OR
```

**Relaciones (siempre las dos puntas):**
```ts
// Hijo (tiene la FK)
@ManyToOne(() => Hotel, (hotel) => hotel.rooms, { onDelete: 'CASCADE' })
hotel: Hotel;

// Padre (NO crea columna)
@OneToMany(() => Room, (room) => room.hotel)
rooms: Room[];
```

**Fechas de creación:** `@CreateDateColumn() createdAt: Date;` (no uses `type: 'timestamp'` en SQLite).

---

## 13. Errores que aparecieron de verdad

| Síntoma | Causa | Solución |
|---|---|---|
| `Unable to connect to the database... DataTypeNotSupportedError: "timestamp"` y los e2e dan `Exceeded timeout of 5000 ms for a hook` | SQLite no soporta `timestamp` | `@CreateDateColumn()` |
| `Must use import to load ES Module: .../@nestjs/mapped-types` | Versión ESM de mapped-types (`"*"` en package.json) | DTOs de update escritos a mano |
| `This expression is not callable ... SuperTestStatic` / `request is not a function` | `import * as request from 'supertest'` | `import request from 'supertest'` |
| `/bookings` responde 404 | `BookingModule` no está en `AppModule` | Agregarlo a `imports` |
| El DTO no rechaza nada | Falta `ValidationPipe` global | `app.useGlobalPipes(...)` en `main.ts` |
| PUT con `available` da 400 | Propiedad no existe en el DTO + `forbidNonWhitelisted` | Declararla en `UpdateRoomDto` |
| `GET /hotels/search` busca el hotel "NaN" | `:id` declarada antes que `search` | Poner rutas fijas primero |
| Tests e2e fallan en la 2ª corrida (`email already in use`) | Se reutiliza `database.sqlite` entre corridas | En `app.module.ts`: `process.env.NODE_ENV === 'test' ? ':memory:' : 'database.sqlite'` (Jest fija `NODE_ENV=test`) |
| `x is not a function` en un test unitario | Tu service usa un método que el mock no tiene | Usa solo los métodos que el test mockeó (§5) |
| `FOREIGN KEY constraint failed` al borrar | Falta `onDelete: 'CASCADE'` en el `ManyToOne` | Agregarlo |

---

## 14. Receta: crear un recurso nuevo desde cero

Ejemplo: `Review` (reseñas). El proceso es siempre idéntico:

1. **Entity** `review/review.entity.ts`
   ```ts
   @Entity()
   export class Review {
     @PrimaryGeneratedColumn() id: number;
     @Column() comment: string;
     @Column() stars: number;
     @CreateDateColumn() createdAt: Date;
     @ManyToOne(() => Hotel, (h) => h.reviews, { onDelete: 'CASCADE' }) hotel: Hotel;
   }
   ```
   Y en `Hotel`: `@OneToMany(() => Review, (r) => r.hotel) reviews: Review[];`
2. **DTO** `review/dto/create-review.dto.ts` con decoradores en **cada** propiedad.
3. **Service** `review.service.ts`: `@InjectRepository(Review)`, métodos `create/findAll/findOne/update/delete`
   con los patrones de §8.
4. **Controller** `review.controller.ts`: rutas con los decoradores de §9 (fijas antes de `:id`).
5. **Module** `review.module.ts`:
   ```ts
   @Module({
     imports: [TypeOrmModule.forFeature([Review])],
     providers: [ReviewService],
     controllers: [ReviewController],
     exports: [ReviewService],
   })
   export class ReviewModule {}
   ```
6. **`AppModule`**: agregar `ReviewModule` a `imports` (el paso que más se olvida).
7. Si otro módulo necesita el repositorio de `Review`, agregarlo a **su** `forFeature([...])`
   (como se hizo con `Room` en `BookingModule`).
8. Probar con `curl`, escribir/ajustar tests y correr `npm test` + `npm run test:e2e`.

**Traducción rápida del dominio hotel a otros:**

| Hotel | Biblioteca | Tienda | Clínica |
|---|---|---|---|
| Hotel | Biblioteca | Tienda | Clínica |
| Room | Libro | Producto | Consultorio |
| Booking | Préstamo | Pedido | Cita |
| `hasDateConflict` | Libro ya prestado | Stock insuficiente | Cita en el mismo horario |
| `totalPrice` | Multa por días | Total del pedido | Costo de la consulta |

---

## 15. Checklist final antes de entregar

- [ ] `npm run start:dev` arranca sin errores.
- [ ] `npm test` → todo en verde.
- [ ] `npm run test:e2e` → todo en verde.
- [ ] `npx tsc --noEmit` sin errores.
- [ ] `rg -n "TODO|BUG|Not implemented" src` → sin pendientes reales.
- [ ] Probaste con `curl` al menos: un caso válido, un 400, un 404 y la regla de negocio principal.
- [ ] No dejaste archivos basura (`database.sqlite`, `dist/` ya están en `.gitignore`).
- [ ] `git add -A && git commit -m "Taller NestJS hotel" && git push` **antes** de que se acabe el tiempo.

---

## 16. Resumen de cambios hechos en este taller

| Archivo | Cambio |
|---|---|
| `src/main.ts` | `ValidationPipe` global (`whitelist` + `forbidNonWhitelisted`) |
| `src/app.module.ts` | Importa `BookingModule`; BD `:memory:` cuando `NODE_ENV === 'test'` |
| `src/*/**.entity.ts` (4) | `createdAt` → `@CreateDateColumn()`; `onDelete: 'CASCADE'` en `Booking.room`; `cascade: true` en `User.bookings`; comentarios aclaratorios |
| `src/user/dto/create-user.dto.ts` | 4 validaciones |
| `src/hotel/dto/create-hotel.dto.ts` | 4 validaciones (+ decoradores en el resto) |
| `src/room/dto/create-room.dto.ts` | 4 validaciones (+ `description`) |
| `src/booking/dto/create-booking.dto.ts` | `@IsInt`, `@IsDateString` x2 |
| `src/hotel/dto/update-hotel.dto.ts` (nuevo) | DTO de PUT |
| `src/room/dto/update-room.dto.ts` (nuevo) | DTO de PUT (incluye `available`) |
| `src/user/user.service.ts` | `ConflictException`; `findOne/findById` → `User \| null`; `delete` |
| `src/hotel/hotel.service.ts` | `update`, `delete`, `searchByLocation`, `getAvailableHotels` |
| `src/room/room.service.ts` | `update`, `delete`, `getAvailability`, `isAvailableForDateRange` |
| `src/booking/booking.service.ts` | Fix `room`, validación de fechas, conflicto, precio, `cancel`, `hasDateConflict`, `getBookingsByDateRange` |
| `src/booking/booking.module.ts` | `Room` en `forFeature` |
| `src/hotel/hotel.controller.ts` | PUT, DELETE, `GET search`, `GET available` |
| `src/room/room.controller.ts` | PUT, DELETE, `GET available` |
| `src/booking/booking.controller.ts` | `DELETE` cancela y devuelve la reserva |
| `src/user/user.controller.ts` | 404 si el usuario no existe |
| `test/*.e2e-spec.ts` | `ValidationPipe` activado (el TODO de cada archivo) e `import request from 'supertest'` |

---

## 17. Mejoras que NO se hicieron

Para no salirse del alcance del taller ni romper los tests, esto quedó igual. Conviene saberlo por si el
parcial lo pide:

- **La respuesta de `POST /users/register` incluye el hash de la contraseña.** En un proyecto real se
  excluye (`@Exclude()` + `ClassSerializerInterceptor`, o `@Column({ select: false })`).
- **JWT no está protegiendo `POST /bookings`.** Para activarlo: `@UseGuards(AuthGuard('jwt'))`
  (`import { AuthGuard } from '@nestjs/passport'`) y leer `req.user.id`. No se activó porque los
  tests e2e llaman sin token (recibirían 401) y no existe endpoint de login. Si el parcial lo pide:
  crear `AuthController` con `POST /auth/login` que valide con `bcrypt.compare` y devuelva
  `this.jwtService.sign({ id: user.id })`. El secreto está hardcodeado como fallback
  (`'your-secret-key'`); debe venir de `process.env.JWT_SECRET`.
- **`ParseIntPipe`**: se mantuvo `parseInt(id)` por consistencia con el código existente. Más robusto:
  `@Param('id', ParseIntPipe) id: number` (devuelve 400 si no es número).
- **`PUT` con body vacío** (`{}`) hace que TypeORM lance `UpdateValuesMissingError` (500).
- **`synchronize: true`** es solo para desarrollo; en producción se usan migraciones.
- **Condición de carrera en reservas:** dos peticiones simultáneas podrían pasar el chequeo de conflicto
  a la vez; la solución real es una transacción o una restricción en BD.
