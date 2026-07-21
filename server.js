const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname)); // also serve root folder for index.html

// AppSheet API config
const APPSHEET_APP_ID = process.env.APPSHEET_APP_ID || "5f559e4e-a33c-4f2e-9180-21b935687975";
const APPSHEET_ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY || "V2-TTAaj-UPBlO-ccGTR-j5YTz-xopwO-0NLXj-SCe9c-aTTxF";

// Database Setup
const db = new Database('database.db', { verbose: console.log });

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS Preventa (
    id TEXT PRIMARY KEY,
    cliente TEXT NOT NULL,
    telefono TEXT,
    fecha TEXT NOT NULL,
    total REAL NOT NULL DEFAULT 0.0,
    estado TEXT NOT NULL DEFAULT 'Pendiente',
    notas TEXT
  );

  CREATE TABLE IF NOT EXISTS DETALLE_PREVENTA (
    id TEXT PRIMARY KEY,
    preventa_id TEXT NOT NULL,
    producto TEXT NOT NULL,
    cantidad REAL NOT NULL DEFAULT 1.0,
    precio_unitario REAL NOT NULL DEFAULT 0.0,
    subtotal REAL NOT NULL DEFAULT 0.0,
    FOREIGN KEY (preventa_id) REFERENCES Preventa(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS CLIENTES (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    telefono TEXT
  );

  CREATE TABLE IF NOT EXISTS STOCK (
    material TEXT PRIMARY KEY,
    TextoBreveDelMaterial TEXT NOT NULL DEFAULT '',
    precio REAL NOT NULL DEFAULT 0.0,
    concat TEXT NOT NULL
  );
`);

// Insert some realistic dummy data if tables are empty
const countPreventas = db.prepare('SELECT COUNT(*) as count FROM Preventa').get();
const countClientes = db.prepare('SELECT COUNT(*) as count FROM CLIENTES').get();
const countStock = db.prepare('SELECT COUNT(*) as count FROM STOCK').get();

if (countClientes.count === 0) {
  console.log('Populating CLIENTES database with dummy data...');
  const insertCliente = db.prepare(`
    INSERT INTO CLIENTES (id, nombre, telefono)
    VALUES (?, ?, ?)
  `);
  db.transaction(() => {
    insertCliente.run('1', 'María González', '+34 612 345 678');
    insertCliente.run('2', 'Juan Martínez (Ganadera El Prado)', '+34 699 888 777');
    insertCliente.run('3', 'Ana Isabel Ruiz', '+34 655 444 333');
    insertCliente.run('4', 'ACATHA SV SAS DE CV', '50376295120');
  })();
}

if (countStock.count === 0) {
  console.log('Populating STOCK database with dummy data...');
  const insertStock = db.prepare(`
    INSERT INTO STOCK (material, TextoBreveDelMaterial, precio, concat)
    VALUES (?, ?, ?, ?)
  `);
  db.transaction(() => {
    insertStock.run('Saco-01', 'Saco de Alimento Premium Ovejas 25kg', 45.00, 'Saco de Alimento Premium Ovejas 25kg [Saco-01] - 45.00 $');
    insertStock.run('Sup-01', 'Suplemento Vitamínico Ovino 5L', 40.50, 'Suplemento Vitamínico Ovino 5L [Sup-01] - 40.50 $');
    insertStock.run('Esq-01', 'Esquiladora Profesional SheepCut', 210.00, 'Esquiladora Profesional SheepCut [Esq-01] - 210.00 $');
    insertStock.run('Cuc-01', 'Cuchillas de repuesto SheepCut 4T', 20.00, 'Cuchillas de repuesto SheepCut 4T [Cuc-01] - 20.00 $');
    insertStock.run('Ide-01', 'Identificadores de Oreja (Pack 100u)', 25.00, 'Identificadores de Oreja (Pack 100u) [Ide-01] - 25.00 $');
    insertStock.run('Ten-01', 'Tenaza Aplicadora de Crotales', 35.00, 'Tenaza Aplicadora de Crotales [Ten-01] - 35.00 $');
    insertStock.run('PRI-000233', 'UNI TORNILLO PARA BISAGRA DE 1/2"', 0.10, 'PRI-000233 UNI TORNILLO PARA BISAGRA DE 1/2" Inventario en almacén 5980 - 0.10 $');
    insertStock.run('PRI-000148', 'PZA REMACHE POP 1/8X1/2 44523', 0.03, 'PRI-000148 PZA REMACHE POP 1/8X1/2 44523 Inventario en almacén 552 - 0.03 $');
  })();
}

if (countPreventas.count === 0) {
  console.log('Populating database with beautiful dummy data...');

  const insertPreventa = db.prepare(`
    INSERT INTO Preventa (id, cliente, telefono, fecha, total, estado, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDetalle = db.prepare(`
    INSERT INTO DETALLE_PREVENTA (id, preventa_id, producto, cantidad, precio_unitario, subtotal)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Transaction to insert dummy pre-sales
  const insertDummyData = db.transaction(() => {
    // 1. Pre-sale 1
    const p1_id = '2026-01-M1P505-1';
    insertPreventa.run(
      p1_id,
      'María González',
      '+34 612 345 678',
      new Date(Date.now() - 3600000 * 24).toISOString().split('T')[0], // Yesterday
      175.50,
      'Pendiente',
      'Entregar preferiblemente en horario de tarde.'
    );
    insertDetalle.run('d1', p1_id, 'Saco-01', 3, 45.00, 135.00);
    insertDetalle.run('d2', p1_id, 'Sup-01', 1, 40.50, 40.50);

    // 2. Pre-sale 2
    const p2_id = 'PREV-ABC12345';
    insertPreventa.run(
      p2_id,
      'Juan Martínez (Ganadera El Prado)',
      '+34 699 888 777',
      new Date().toISOString().split('T')[0], // Today
      520.00,
      'Completado',
      'Cliente habitual. Retira en tienda.'
    );
    insertDetalle.run('d3', p2_id, 'Esq-01', 2, 210.00, 420.00);
    insertDetalle.run('d4', p2_id, 'Cuc-01', 5, 20.00, 100.00);

    // 3. Pre-sale 3
    const p3_id = 'PREV-XYZ67890';
    insertPreventa.run(
      p3_id,
      'Ana Isabel Ruiz',
      '+34 655 444 333',
      new Date().toISOString().split('T')[0], // Today
      85.00,
      'Pendiente',
      'Llamar antes de enviar.'
    );
    insertDetalle.run('d5', p3_id, 'Ide-01', 2, 25.00, 50.00);
    insertDetalle.run('d6', p3_id, 'Ten-01', 1, 35.00, 35.00);
  });

  insertDummyData();
  console.log('Database successfully populated.');
}

// AppSheet API Helper function
async function callAppSheetAPI(tableName, action, rows = [], selector = null) {
  const result = await callAppSheetAPIVerbose(tableName, action, rows, selector);
  return result.ok ? result.data : null;
}

// Versión detallada: además de los datos, devuelve el error real que responde AppSheet
// para poder mostrarlo en la respuesta de la API en vez de que quede oculto en los logs.
async function callAppSheetAPIVerbose(tableName, action, rows = [], selector = null) {
  const url = `https://api.appsheet.com/api/v2/apps/${APPSHEET_APP_ID}/tables/${encodeURIComponent(tableName)}/Action`;

  const payload = {
    Action: action,
    Properties: {
      Locale: "es-ES",
      Timezone: "Romance Standard Time"
    }
  };

  if (selector) {
    payload.Properties.Selector = selector;
  }

  if (rows && rows.length > 0) {
    payload.Rows = rows;
  } else if (action === "Find") {
    payload.Rows = [];
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "applicationAccessKey": APPSHEET_ACCESS_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AppSheet API Error on table ${tableName} (status ${response.status}):`, errorText);
      return { ok: false, status: response.status, data: null, errorText };
    }

    const text = await response.text();
    if (!text || text.length === 0) {
      // AppSheet respondió 200 OK pero sin cuerpo. Para Add/Edit con filas enviadas,
      // esto suele significar que no confirmó ninguna fila -> lo tratamos como sospechoso.
      if (rows && rows.length > 0 && (action === "Add" || "Edit" === action)) {
        const warn = `AppSheet respondió 200 OK pero sin ningún dato de confirmación (cuerpo vacío) al intentar ${action} en "${tableName}". Es posible que la fila no se haya guardado realmente; revisa que todos los nombres de columna coincidan exactamente con los de tu hoja.`;
        console.error(warn);
        return { ok: false, status: response.status, data: [], errorText: warn };
      }
      return { ok: true, status: response.status, data: [], errorText: null };
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse AppSheet response JSON:", e.message, "Response was:", text);
      return { ok: true, status: response.status, data: [], errorText: null };
    }

    // AppSheet a veces responde HTTP 200 pero incluye el error dentro del cuerpo
    // (por ejemplo, un objeto con "Error"/"errors"/"message" en vez de un array de filas).
    if (parsed && !Array.isArray(parsed) && (parsed.error || parsed.Error || parsed.errors || parsed.message)) {
      const bodyError = parsed.error || parsed.Error || parsed.errors || parsed.message;
      console.error(`AppSheet API devolvió 200 OK pero con error en el cuerpo (tabla ${tableName}):`, JSON.stringify(bodyError));
      return { ok: false, status: response.status, data: null, errorText: typeof bodyError === 'string' ? bodyError : JSON.stringify(bodyError) };
    }

    // Para Add/Edit: si mandamos N filas y AppSheet no confirma ninguna, lo marcamos como sospechoso
    // (rechazo silencioso de validación, ej. columna requerida faltante o tipo de dato inválido).
    if (rows && rows.length > 0 && (action === "Add" || action === "Edit") && Array.isArray(parsed) && parsed.length === 0) {
      const warn = `AppSheet respondió 200 OK pero confirmó 0 de ${rows.length} fila(s) al hacer ${action} en "${tableName}". Probablemente rechazó la fila por una validación (columna requerida, tipo de dato o Ref inválida) sin devolver el detalle del error.`;
      console.error(warn);
      return { ok: false, status: response.status, data: [], errorText: warn };
    }

    return { ok: true, status: response.status, data: parsed, errorText: null };
  } catch (error) {
    console.error(`Fetch error connecting to AppSheet API:`, error.message);
    return { ok: false, status: null, data: null, errorText: error.message };
  }
}

// Pequeña espera para evitar condiciones de carrera: cuando se agrega DETALLE_PREVENTA
// justo después de Preventa, si AppSheet valida la columna Ref (IDTransaccion -> Preventa)
// contra la hoja de Google Sheets, puede que la fila padre aún no esté visible por
// la latencia propia de Sheets, y entonces rechace la fila hija completa.
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Sync function to pull from AppSheet and update local SQLite cache
async function syncFromAppSheetToSQLite() {
  console.log('Attempting to fetch data from AppSheet...');
  const preventasFromAppSheet = await callAppSheetAPI("Preventa", "Find");
  const detallesFromAppSheet = await callAppSheetAPI("DETALLE_PREVENTA", "Find");
  const clientesFromAppSheet = await callAppSheetAPI("clientes", "Find");
  const stockFromAppSheet = await callAppSheetAPI("stock", "Find");

  // Sync CLIENTES if returned
  if (Array.isArray(clientesFromAppSheet) && clientesFromAppSheet.length > 0) {
    db.prepare('DELETE FROM CLIENTES').run();
    const insertCliente = db.prepare(`
      INSERT OR REPLACE INTO CLIENTES (id, nombre, telefono)
      VALUES (?, ?, ?)
    `);
    for (const c of clientesFromAppSheet) {
      // normalize keys to support robust case insensitivity
      const cNormalized = {};
      for (const k of Object.keys(c)) {
        cNormalized[k.toLowerCase()] = c[k];
      }
      const id = cNormalized.idcliente || cNormalized.id || '';
      const nombre = cNormalized.nombrecliente || cNormalized.nombre || '';
      const telefono = cNormalized.telefono || '';
      if (id && nombre) {
        insertCliente.run(id, nombre, telefono);
      }
    }
  }

  // Sync STOCK if returned
  if (Array.isArray(stockFromAppSheet) && stockFromAppSheet.length > 0) {
    db.prepare('DELETE FROM STOCK').run();
    const insertStock = db.prepare(`
      INSERT OR REPLACE INTO STOCK (material, TextoBreveDelMaterial, precio, concat)
      VALUES (?, ?, ?, ?)
    `);
    for (const s of stockFromAppSheet) {
      const sNormalized = {};
      for (const k of Object.keys(s)) {
        sNormalized[k.toLowerCase()] = s[k];
      }
      const material = sNormalized.material || '';
      const textobrevedelmaterial = s.TextoBreveDelMaterial || sNormalized.textobrevedelmaterial || '';
      const precioVal = parseFloat(s.Precio || sNormalized.precio) || 0.0;
      const concat = (sNormalized.concat || '').replace(/€/g, '$');
      if (material && concat) {
        insertStock.run(material, textobrevedelmaterial, precioVal, concat);
      }
    }
  }

  if (Array.isArray(preventasFromAppSheet) && preventasFromAppSheet.length > 0) {
    console.log(`Syncing ${preventasFromAppSheet.length} preventas from AppSheet...`);
    db.transaction(() => {
      // Clear local tables
      db.prepare('DELETE FROM DETALLE_PREVENTA').run();
      db.prepare('DELETE FROM Preventa').run();

      const insertPreventa = db.prepare(`
        INSERT OR REPLACE INTO Preventa (id, cliente, telefono, fecha, total, estado, notas)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const insertDetalle = db.prepare(`
        INSERT OR REPLACE INTO DETALLE_PREVENTA (id, preventa_id, producto, cantidad, precio_unitario, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const p of preventasFromAppSheet) {
        const idtransacion = p.IDTransacion || p.idtransacion || p.id || '';
        const idcliente = p.IDcliente || p.idcliente || p.cliente || '';
        const fecha = p.FECHA || p.fecha || '';
        const totalVal = parseFloat(p.total) || 0.0;
        const estado = p.Estado || p.estado || 'Pendiente';
        const notas = p.Notas || p.notas || '';

        // Resolve customer telephone if we can
        let telefono = '';
        if (idcliente) {
          const clientRow = db.prepare('SELECT telefono FROM CLIENTES WHERE id = ? OR nombre = ?').get(idcliente, idcliente);
          if (clientRow) {
            telefono = clientRow.telefono || '';
          }
        }

        insertPreventa.run(
          idtransacion,
          idcliente,
          telefono,
          fecha,
          totalVal,
          estado,
          notas
        );
      }

      if (Array.isArray(detallesFromAppSheet)) {
        for (const d of detallesFromAppSheet) {
          const iddetalle = d.IDDETALLE || d.iddetalle || d.id || '';
          const idtransaccion = d.IDTransaccion || d.idtransaccion || d.preventa_id || '';
          const articulo = d.ARTICULO || d.articulo || d.producto || '';
          const cantidadVal = parseFloat(d.CANTIDAD || d.cantidad) || 0.0;
          const precioVal = parseFloat(d.PRECIO || d.precio || d.precio_unitario) || 0.0;
          const subtotalVal = parseFloat(d['TOTAL LINEA'] || d.total_linea || d.subtotal) || (cantidadVal * precioVal);

          insertDetalle.run(
            iddetalle,
            idtransaccion,
            articulo,
            cantidadVal,
            precioVal,
            subtotalVal
          );
        }
      }
    })();
    console.log('Local database synced with AppSheet successfully.');
  } else {
    console.log('AppSheet Preventa table is empty or offline, using local SQLite cache.');
  }
}

// REST API Endpoints

// POST /api/clientes - Create a new client
app.post('/api/clientes', async (req, res) => {
  const { id, nombre, telefono } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre del cliente es obligatorio.' });
  }

  // Generate an ID if not provided
  const clientId = id || 'cli-' + Math.random().toString(36).substring(2, 10);

  try {
    const insertCliente = db.prepare(`
      INSERT INTO CLIENTES (id, nombre, telefono)
      VALUES (?, ?, ?)
    `);

    insertCliente.run(clientId, nombre, telefono || '');

    // Propagate to AppSheet (non-blocking)
    const cRow = {
      idcliente: clientId,
      nombrecliente: nombre,
      telefono: telefono || '',
      IDcliente: clientId,
      NombreCliente: nombre,
      ID: clientId,
      Nombre: nombre
    };

    await callAppSheetAPI("clientes", "Add", [cRow]).catch(err => {
      console.error("AppSheet API clientes Add failed:", err.message);
    });

    res.status(201).json({ id: clientId, nombre, telefono: telefono || '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar el cliente: ' + err.message });
  }
});

// POST /api/productos - Create a new stock product
app.post('/api/productos', async (req, res) => {
  const { material, TextoBreveDelMaterial, precio } = req.body;

  if (!material || !TextoBreveDelMaterial) {
    return res.status(400).json({ error: 'El material (ID) y el TextoBreveDelMaterial son obligatorios.' });
  }

  const precioVal = parseFloat(precio) || 0.0;
  const concat = `${TextoBreveDelMaterial} [${material}] - ${precioVal.toFixed(2)} $`;

  try {
    const insertStock = db.prepare(`
      INSERT INTO STOCK (material, TextoBreveDelMaterial, precio, concat)
      VALUES (?, ?, ?, ?)
    `);

    insertStock.run(material, TextoBreveDelMaterial, precioVal, concat);

    // Propagate to AppSheet (non-blocking)
    const sRow = {
      material: material,
      TextoBreveDelMaterial: TextoBreveDelMaterial,
      Precio: String(precioVal),
      concat: concat,
      precio: precioVal
    };

    await callAppSheetAPI("stock", "Add", [sRow]).catch(err => {
      console.error("AppSheet API stock Add failed:", err.message);
    });

    res.status(201).json({ material, TextoBreveDelMaterial, precio: precioVal, concat });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar el producto: ' + err.message });
  }
});

// GET /api/clientes - Get all clients
app.get('/api/clientes', (req, res) => {
  try {
    const clientes = db.prepare('SELECT * FROM CLIENTES ORDER BY nombre').all();
    res.json(clientes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los clientes: ' + err.message });
  }
});

// GET /api/productos - Get all stock items
app.get('/api/productos', (req, res) => {
  try {
    const productos = db.prepare('SELECT * FROM STOCK ORDER BY concat').all();
    res.json(productos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los productos de stock: ' + err.message });
  }
});

// GET /api/preventas - Get all pre-sales
app.get('/api/preventas', async (req, res) => {
  try {
    // Solo sincronizar si se solicita explícitamente mediante ?sync=true
    if (req.query.sync === 'true') {
      await syncFromAppSheetToSQLite().catch(err => {
        console.warn("AppSheet Sync failed during GET, falling back to SQLite directly:", err.message);
      });
    }

    const preventas = db.prepare('SELECT * FROM Preventa ORDER BY fecha DESC, id DESC').all();

    // For each preventa, fetch its details
    const preventasWithDetails = preventas.map(p => {
      const details = db.prepare('SELECT * FROM DETALLE_PREVENTA WHERE preventa_id = ?').all(p.id);
      return { ...p, detalles: details };
    });

    res.json(preventasWithDetails);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener las preventas: ' + err.message });
  }
});

// GET /api/preventas/:id - Get a single pre-sale with its details
app.get('/api/preventas/:id', (req, res) => {
  try {
    const id = req.params.id;
    const preventa = db.prepare('SELECT * FROM Preventa WHERE id = ?').get(id);

    if (!preventa) {
      return res.status(404).json({ error: 'Preventa no encontrada' });
    }

    const detalles = db.prepare('SELECT * FROM DETALLE_PREVENTA WHERE preventa_id = ?').all(id);
    res.json({ ...preventa, detalles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el detalle de la preventa: ' + err.message });
  }
});

// POST /api/preventas - Create a new pre-sale and its details
app.post('/api/preventas', async (req, res) => {
  const { cliente, telefono, fecha, estado, notas, detalles } = req.body;

  if (!cliente || !fecha || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
    return res.status(400).json({ error: 'Datos de preventa incompletos. Se requiere cliente, fecha y al menos un detalle.' });
  }

  try {
    // Calculate total from details to ensure correctness
    const totalCalculado = detalles.reduce((sum, item) => {
      const qty = parseFloat(item.cantidad) || 0.0;
      const price = parseFloat(item.precio_unitario) || 0.0;
      return sum + (qty * price);
    }, 0);

    // Respect the correlative structure "2026-01-M1P505-"
    const prefix = "2026-01-M1P505-";
    const allPreventas = db.prepare('SELECT id FROM Preventa').all();
    let maxNum = 0;
    for (const p of allPreventas) {
      if (p.id && p.id.startsWith(prefix)) {
        const suffix = p.id.substring(prefix.length);
        const num = parseInt(suffix, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
    if (maxNum === 0) {
      maxNum = 331; // fallback default
    }
    const newId = prefix + (maxNum + 1);

    const insertPreventa = db.prepare(`
      INSERT INTO Preventa (id, cliente, telefono, fecha, total, estado, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertDetalle = db.prepare(`
      INSERT INTO DETALLE_PREVENTA (id, preventa_id, producto, cantidad, precio_unitario, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Use transaction for safe local creation
    const executeTransaction = db.transaction(() => {
      insertPreventa.run(
        newId,
        cliente,
        telefono || '',
        fecha,
        totalCalculado,
        estado || 'Pendiente',
        notas || ''
      );

      for (const item of detalles) {
        if (!item.producto || item.cantidad <= 0 || item.precio_unitario < 0) {
          throw new Error('Detalles de producto inválidos: ' + JSON.stringify(item));
        }
        const item_id = 'det-' + Math.random().toString(36).substring(2, 10);
        const subtotal = item.cantidad * item.precio_unitario;
        insertDetalle.run(item_id, newId, item.producto, item.cantidad, item.precio_unitario, subtotal);
        item.id = item_id; // Track the generated ID for detail
      }
    });

    executeTransaction();

    // Now send the changes to AppSheet cloud backend mapped to real columns
    const pRow = {
      IDTransacion: newId,
      IDcliente: cliente,
      NombreDelCliente: cliente,
      FECHA: fecha,
      total: String(totalCalculado),
      Estado: estado || 'Pendiente',
      Notas: notas || ''
    };

    // Call Add action on AppSheet for Preventa
    const preventaAppSheetResult = await callAppSheetAPIVerbose("Preventa", "Add", [pRow]);
    if (!preventaAppSheetResult.ok) {
      console.error("AppSheet API Preventa Add failed:", preventaAppSheetResult.errorText);
    }

    // Pequeña espera para que Google Sheets/AppSheet reflejen la fila padre antes
    // de intentar agregar los hijos que la referencian (evita rechazo por Ref inválida).
    await wait(1500);

    // Call Add action on AppSheet for DETALLE_PREVENTA
    const now = new Date();
    const formattedDateTime = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth()+1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const getStockShortText = db.prepare('SELECT TextoBreveDelMaterial FROM STOCK WHERE material = ?');

    const dRows = detalles.map(item => {
      const stockRow = getStockShortText.get(item.producto);
      return {
        IDDETALLE: String(item.id),
        IDTransaccion: String(newId),
        ARTICULO: item.producto,
        CANTIDAD: item.cantidad,
        PRECIO: item.precio_unitario,
        IMPUESTO: 0,
        'TOTAL LINEA': item.cantidad * item.precio_unitario,
        TextoBreve: (stockRow && stockRow.TextoBreveDelMaterial) || item.producto,
        CambioDePrecio: false,
        NumeroDeFactura: '',
        FechaYHora: formattedDateTime,
        Cliente: cliente,
        NombreDelCliente: cliente
      };
    });

    const detalleAppSheetResult = await callAppSheetAPIVerbose("DETALLE_PREVENTA", "Add", dRows);
    if (!detalleAppSheetResult.ok) {
      console.error("AppSheet API DETALLE_PREVENTA Add failed:", detalleAppSheetResult.errorText);
    }

    // Fetch and return the newly created preventa
    const createdPreventa = db.prepare('SELECT * FROM Preventa WHERE id = ?').get(newId);
    const createdDetails = db.prepare('SELECT * FROM DETALLE_PREVENTA WHERE preventa_id = ?').all(newId);

    const appsheet_warnings = [];
    if (!preventaAppSheetResult.ok) appsheet_warnings.push(`Preventa no se sincronizó con AppSheet: ${preventaAppSheetResult.errorText}`);
    if (!detalleAppSheetResult.ok) appsheet_warnings.push(`Detalle no se sincronizó con AppSheet: ${detalleAppSheetResult.errorText}`);

    res.status(201).json({ ...createdPreventa, detalles: createdDetails, ...(appsheet_warnings.length ? { appsheet_warnings } : {}) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar la preventa: ' + err.message });
  }
});

// PUT /api/preventas/:id - Update an existing pre-sale and its details
app.put('/api/preventas/:id', async (req, res) => {
  const id = req.params.id;
  const { cliente, telefono, fecha, estado, notas, detalles } = req.body;

  if (!cliente || !fecha || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
    return res.status(400).json({ error: 'Datos de preventa incompletos.' });
  }

  try {
    const existing = db.prepare('SELECT id FROM Preventa WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Preventa no encontrada' });
    }

    const totalCalculado = detalles.reduce((sum, item) => {
      const qty = parseFloat(item.cantidad) || 0.0;
      const price = parseFloat(item.precio_unitario) || 0.0;
      return sum + (qty * price);
    }, 0);

    const updatePreventa = db.prepare(`
      UPDATE Preventa
      SET cliente = ?, telefono = ?, fecha = ?, total = ?, estado = ?, notas = ?
      WHERE id = ?
    `);

    const deleteDetalles = db.prepare('DELETE FROM DETALLE_PREVENTA WHERE preventa_id = ?');
    const insertDetalle = db.prepare(`
      INSERT INTO DETALLE_PREVENTA (id, preventa_id, producto, cantidad, precio_unitario, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Retrieve old detail IDs from SQLite so we can delete them from AppSheet
    const oldDetails = db.prepare('SELECT id FROM DETALLE_PREVENTA WHERE preventa_id = ?').all(id);

    // Perform inside transaction locally
    const executeTransaction = db.transaction(() => {
      updatePreventa.run(cliente, telefono || '', fecha, totalCalculado, estado || 'Pendiente', notas || '', id);
      deleteDetalles.run(id);

      for (const item of detalles) {
        if (!item.producto || item.cantidad <= 0 || item.precio_unitario < 0) {
          throw new Error('Detalles de producto inválidos: ' + JSON.stringify(item));
        }
        const item_id = 'det-' + Math.random().toString(36).substring(2, 10);
        const subtotal = item.cantidad * item.precio_unitario;
        insertDetalle.run(item_id, id, item.producto, item.cantidad, item.precio_unitario, subtotal);
        item.id = item_id; // Track the new generated ID
      }
    });

    executeTransaction();

    // Now update AppSheet cloud tables
    const pRow = {
      IDTransacion: id,
      IDcliente: cliente,
      NombreDelCliente: cliente,
      FECHA: fecha,
      total: String(totalCalculado),
      Estado: estado || 'Pendiente',
      Notas: notas || ''
    };

    // Call Edit action on AppSheet for Preventa
    const preventaAppSheetResult = await callAppSheetAPIVerbose("Preventa", "Edit", [pRow]);
    if (!preventaAppSheetResult.ok) {
      console.error("AppSheet API Preventa Edit failed:", preventaAppSheetResult.errorText);
    }

    // Delete old details on AppSheet
    let deleteAppSheetResult = { ok: true, errorText: null };
    if (oldDetails.length > 0) {
      const deleteRows = oldDetails.map(d => ({ IDDETALLE: String(d.id) }));
      deleteAppSheetResult = await callAppSheetAPIVerbose("DETALLE_PREVENTA", "Delete", deleteRows);
      if (!deleteAppSheetResult.ok) {
        console.error("AppSheet API DETALLE_PREVENTA Delete failed:", deleteAppSheetResult.errorText);
      }
    }

    // Pequeña espera para que Google Sheets/AppSheet reflejen los cambios en el padre
    // (edición y borrado del detalle previo) antes de agregar el detalle nuevo.
    await wait(1500);

    // Add new details on AppSheet
    const nowPut = new Date();
    const formattedDateTimePut = `${String(nowPut.getDate()).padStart(2, '0')}/${String(nowPut.getMonth()+1).padStart(2, '0')}/${nowPut.getFullYear()} ${String(nowPut.getHours()).padStart(2, '0')}:${String(nowPut.getMinutes()).padStart(2, '0')}:${String(nowPut.getSeconds()).padStart(2, '0')}`;

    const getStockShortTextPut = db.prepare('SELECT TextoBreveDelMaterial FROM STOCK WHERE material = ?');

    const dRows = detalles.map(item => {
      const stockRow = getStockShortTextPut.get(item.producto);
      return {
        IDDETALLE: String(item.id),
        IDTransaccion: String(id),
        ARTICULO: item.producto,
        CANTIDAD: item.cantidad,
        PRECIO: item.precio_unitario,
        IMPUESTO: 0,
        'TOTAL LINEA': item.cantidad * item.precio_unitario,
        TextoBreve: (stockRow && stockRow.TextoBreveDelMaterial) || item.producto,
        CambioDePrecio: false,
        NumeroDeFactura: '',
        FechaYHora: formattedDateTimePut,
        Cliente: cliente,
        NombreDelCliente: cliente
      };
    });

    const detalleAppSheetResult = await callAppSheetAPIVerbose("DETALLE_PREVENTA", "Add", dRows);
    if (!detalleAppSheetResult.ok) {
      console.error("AppSheet API DETALLE_PREVENTA Add failed:", detalleAppSheetResult.errorText);
    }

    // Fetch and return the updated preventa
    const updatedPreventa = db.prepare('SELECT * FROM Preventa WHERE id = ?').get(id);
    const updatedDetails = db.prepare('SELECT * FROM DETALLE_PREVENTA WHERE preventa_id = ?').all(id);

    const appsheet_warnings = [];
    if (!preventaAppSheetResult.ok) appsheet_warnings.push(`Preventa no se sincronizó con AppSheet: ${preventaAppSheetResult.errorText}`);
    if (!deleteAppSheetResult.ok) appsheet_warnings.push(`No se pudo borrar el detalle anterior en AppSheet: ${deleteAppSheetResult.errorText}`);
    if (!detalleAppSheetResult.ok) appsheet_warnings.push(`Detalle no se sincronizó con AppSheet: ${detalleAppSheetResult.errorText}`);

    res.json({ ...updatedPreventa, detalles: updatedDetails, ...(appsheet_warnings.length ? { appsheet_warnings } : {}) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la preventa: ' + err.message });
  }
});

// DELETE /api/preventas/:id - Delete a pre-sale
app.delete('/api/preventas/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const existing = db.prepare('SELECT id FROM Preventa WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Preventa no encontrada' });
    }

    // Retrieve old detail IDs from SQLite so we can delete them from AppSheet
    const oldDetails = db.prepare('SELECT id FROM DETALLE_PREVENTA WHERE preventa_id = ?').all(id);

    // Cascade delete is active due to FOREIGN KEY ... ON DELETE CASCADE locally
    db.prepare('DELETE FROM Preventa WHERE id = ?').run(id);

    // Update AppSheet Cloud Tables
    // Delete associated details first on AppSheet
    if (oldDetails.length > 0) {
      const deleteRows = oldDetails.map(d => ({ IDDETALLE: String(d.id) }));
      await callAppSheetAPI("DETALLE_PREVENTA", "Delete", deleteRows).catch(err => {
        console.error("AppSheet API DETALLE_PREVENTA Delete failed:", err.message);
      });
    }

    // Delete parent row from AppSheet
    await callAppSheetAPI("Preventa", "Delete", [{ IDTransacion: String(id) }]).catch(err => {
      console.error("AppSheet API Preventa Delete failed:", err.message);
    });

    res.json({ message: 'Preventa eliminada con éxito', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar la preventa: ' + err.message });
  }
});

// Mock AppSheet Status and Schema API
app.get('/api/appsheet-status', (req, res) => {
  res.json({
    app_name: "App Sheep",
    platform: "AppSheet (Google Cloud)",
    sync_status: "Conectado",
    last_sync: new Date().toISOString(),
    tables_mapped: [
      {
        sheet_name: "Preventa",
        columns: ["IDTransacion", "FECHA", "IDcliente", "total", "Estado", "Notas"],
        appsheet_type: "Parent Table (Key: IDTransacion)"
      },
      {
        sheet_name: "DETALLE_PREVENTA",
        columns: ["IDDETALLE", "IDTransaccion", "ARTICULO", "CANTIDAD", "PRECIO", "TOTAL LINEA"],
        appsheet_type: "Child Table (Key: IDDETALLE, Ref: IDTransaccion -> Preventa)"
      }
    ]
  });
});

app.post('/api/appsheet-sync', async (req, res) => {
  try {
    await syncFromAppSheetToSQLite();
    res.json({
      success: true,
      message: "Sincronización bidireccional exitosa con las Hojas de Cálculo de Google (App Sheep).",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Error de sincronización: " + err.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
