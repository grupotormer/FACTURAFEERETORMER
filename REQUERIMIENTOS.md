# Requerimientos Técnicos: Sistema de Facturación Electrónica (El Salvador)

Este documento detalla los requerimientos técnicos para la implementación de un Sistema de Facturación Electrónica para El Salvador, integrado con Wit.ai (NLP), GitHub (Gestión de código/CI-CD) y AppSheet (Interfaz de usuario y base de datos relacional).

---

## 1. Módulo de Facturación Electrónica (DTE) - Ministerio de Hacienda (MH)

Para operar legalmente en El Salvador, el sistema debe cumplir estrictamente con la normativa de Documentos Tributarios Electrónicos (DTE) dictada por la Dirección General de Impuestos Internos (DGII) del Ministerio de Hacienda.

### 1.1. Tipos de Documentos Tributarios Electrónicos (DTE) Soportados:
* **Factura de Consumidor Final (DTE Tipo 01):** Emitido para operaciones con clientes no registrados como contribuyentes de IVA. Requiere DUI (u otro documento de identidad si supera los $200.00).
* **Comprobante de Crédito Fiscal (DTE Tipo 03):** Emitido para transferencias entre contribuyentes de IVA. Requiere de forma obligatoria NIT, NRC (Número de Registro de Contribuyente) y Actividad Económica.
* **Nota de Crédito (DTE Tipo 05) / Nota de Débito (DTE Tipo 06):** Para ajustes posteriores a la emisión del DTE.

### 1.2. Protocolo de Transmisión y Seguridad con el MH:
* **Autenticación (OAuth2):** Obtención de un Token de Acceso temporal mediante llamada POST al endpoint de autenticación del MH usando la clave privada del contribuyente y el token de seguridad provisto por la DGII.
* **Firma Electrónica:** Cada JSON de DTE debe ser firmado localmente mediante una llave privada y certificado digital autorizado por el MH en formato JSON Web Signature (JWS) utilizando el algoritmo RS256.
* **Estructura del JSON del DTE:** Debe cumplir con la versión del esquema vigente del MH, conteniendo:
  * Identificación del receptor (DUI, NIT, NRC, Nombre, Actividad Económica).
  * Cuerpo del documento (Artículos, Cantidad, Precio Unitario, Descuentos, Ventas Gravadas/Exentas/No Sujetas).
  * Cálculos de Impuestos (IVA 13% desagregado para CCF, o incluido en el precio para FCF; retenciones/percepciones del 1% de IVA si aplica).
  * Resumen de la transacción.
* **Código de Generación (UUID):** El sistema emisor debe generar un UUID único v4 de 36 caracteres para cada DTE antes del envío.
* **Transmisión y Recepción (Sello de Recepción):** Envío del JSON firmado mediante llamada POST al endpoint de recepción del MH. La respuesta exitosa devuelve un **Sello de Recepción** (un código hash alfanumérico largo y fecha de recepción) que valida oficialmente el documento.
* **Plan de Contingencia (Offline):** En caso de pérdida de conexión a internet o fallas en el MH, el sistema debe permitir acumular los DTE localmente y transmitirlos en un plazo máximo de 24 horas posteriores al restablecimiento del servicio.

### 1.3. Representación Gráfica (Ticket/Factura PDF):
* El ticket térmico o PDF debe contener obligatoriamente:
  * El **Código de Generación (UUID)** y el **Sello de Recepción**.
  * Un **Código QR** que enlace directamente a la URL de consulta pública del Ministerio de Hacienda de El Salvador para que el receptor pueda validar la autenticidad del DTE.
  * Leyenda de contingencia si el documento fue emitido bajo ese modelo.

---

## 2. Integración de Inteligencia Artificial - Wit.ai (NLP)

Wit.ai se integrará en el sistema de facturación para simplificar y agilizar los flujos mediante comandos de voz o texto natural desde la interfaz de usuario.

### 2.1. Entrenamiento de Intenciones (Intents):
* `facturar_preventa`: Activa el flujo de facturación de una preventa existente.
* `buscar_cliente`: Filtra el directorio de clientes.
* `generar_dte`: Confirma y emite el DTE actual.

### 2.2. Definición de Entidades (Entities):
* `id_preventa` (wit/number o expresión regular tipo `2026-01-M1P505-\d+`): Extrae el ID de la preventa de expresiones como *"Facturar preventa 332"*.
* `nombre_cliente` (wit/contact): Reconoce nombres de personas o empresas.
* `tipo_dte` (lista personalizada): Reconoce términos como *"Crédito Fiscal"*, *"Factura"*, *"DTE"*.

### 2.3. Flujo de Integración en el Frontend/Backend:
1. El usuario presiona un botón de micrófono o escribe en una barra de comandos de voz/texto.
2. El audio o texto se envía mediante llamada POST a `https://api.wit.ai/message` con el token de acceso.
3. Wit.ai devuelve un payload JSON con el intent identificado y las entidades extraídas con su nivel de confianza (confidence).
4. El frontend analiza la respuesta: si detecta `facturar_preventa` con un `id_preventa`, extrae el ID, navega automáticamente al módulo de facturación, carga los datos de esa preventa y los presenta listos para facturar.

---

## 3. Gestión de Código e Integración Continua - GitHub

GitHub se utilizará como la plataforma central para el control de versiones del código fuente, revisión entre pares e integración/despliegue continuo (CI/CD).

### 3.1. Estrategia de Ramas (GitHub Flow):
* **Rama `main` (o `master`):** Código de producción siempre estable y listo para desplegar.
* **Ramas de función (`feature/*`, `bugfix/*`):** Ramas de corta vida creadas para implementar características específicas (por ejemplo, `feature/modulo-facturacion`).
* **Pull Requests (PR):** Toda integración a `main` debe hacerse a través de un PR con revisión obligatoria por parte de otro ingeniero y aprobación condicionada a que pasen todos los tests automatizados.

### 3.2. Integración y Despliegue Continuo (CI/CD - GitHub Actions):
* **Flujo de Integración Continua (CI):** Se ejecuta en cada Push o PR para validar la integridad del software:
  * Ejecución de Linters (ESLint, Prettier) para verificar la calidad de código.
  * Ejecución de pruebas unitarias y de integración (Jest, Playwright) para asegurar que el sistema no presente regresiones.
* **Gestión de Secretos:** Las claves de acceso de Wit.ai (`WIT_ACCESS_TOKEN`), AppSheet API keys (`APPSHEET_ACCESS_KEY`), y credenciales de prueba del MH se almacenarán de forma segura en **GitHub Secrets** y se inyectarán como variables de entorno durante los pipelines de construcción y pruebas.

---

## 4. Estructura de Datos e Interfaz - AppSheet

AppSheet proporciona la base de datos relacional (conectada a Google Sheets u otra fuente de datos cloud) y la interfaz para dispositivos móviles de los agentes de venta.

### 4.1. Mapeo de Tablas en el Sistema:
* **Preventa (Cabecera):** Almacena `IDTransacion` (Primary Key), `IDcliente`, `NombreDelCliente`, `FECHA`, `total`, `PrecioSinIva`, `Iva`, `Notas` y `Estado`.
* **DETALLE_PREVENTA (Detalle de Línea):** Contiene `IDDETALLE` (Primary Key), `IDTransaccion` (Foreign Key hacia Preventa), `ARTICULO`, `CANTIDAD`, `PRECIO`, `TOTAL LINEA` y `TextoBreve` (descripción del material).
* **clientes:** Almacena `IDCliente` (Primary Key), `NombreCliente`, `NIT`, `NRC`, `Direccion`, `Telefono` y `Email`.
* **stock:** Almacena `Material` (Primary Key), `TextoBreveDelMaterial`, `Precio`, `Stock` y `Categoría`.
* **DTE_REGISTRO (Nueva Tabla de Facturas Emitidas):** Almacena `ID_DTE` (Primary Key), `ID_Preventa` (Foreign Key), `Tipo_DTE`, `Codigo_Generacion` (UUID), `Sello_Recepcion` (MH), `Fecha_Emision` y `Enlace_Consulta_QR`.

---

## 5. Módulo Conectado de Facturación (Nueva Pantalla)

Módulo interactivo en el dashboard web que permite jalar datos de preventas mediante su ID y completar el proceso de emisión del DTE salvadoreño.

### 5.1. Flujo de Trabajo del Módulo:
1. **Búsqueda de Preventa:** El operador coloca el ID de una preventa (ej. `332` o `2026-01-M1P505-332`) en el buscador del módulo.
2. **Carga en Tiempo Real:** El sistema busca en la base de datos local SQLite y AppSheet. Al encontrarla, autocompila:
   * **Datos del Cliente:** Nombre/Razón Social, Teléfono, NIT, NRC, Dirección, Email.
   * **Detalle de Artículos:** Tabla de productos con cantidad, precio unitario, subtotal y total de cada línea.
3. **Selección del Documento (DTE):**
   * El operador selecciona el Tipo de DTE: "Factura de Consumidor Final" o "Comprobante de Crédito Fiscal".
   * El sistema habilita de forma inteligente los campos requeridos correspondientes (DUI para Factura si supera $200, NIT/NRC/Giro para Crédito Fiscal).
4. **Cálculos de Impuestos (Normativa de El Salvador):**
   * **Factura (IVA Incluido):** Los subtotales de línea muestran el precio de venta final. Al final se desglosa el cálculo informativo del IVA (13%).
   * **Crédito Fiscal (Precio sin IVA + IVA 13%):** Se calcula el subtotal neto de IVA para cada línea, se aplica el 13% de IVA al final de forma explícita y se calcula el gran total.
5. **Transmisión y Emisión Simulada (MH):**
   * El operador hace clic en "Procesar Factura Electrónica".
   * El sistema simula la firma digital JWS, la generación del UUID (Código de Generación) y la transmisión exitosa al Ministerio de Hacienda, recibiendo un Sello de Recepción ficticio.
   * Se muestra un botón de "Imprimir DTE / Ver Representación Gráfica" que genera un ticket en formato térmico (80mm) que incluye el logotipo de la empresa, datos del emisor, datos del receptor, desglose de productos, cálculos salvadoreños, Código de Generación, Sello de Recepción y el **Código QR oficial** para la validación tributaria directa.
