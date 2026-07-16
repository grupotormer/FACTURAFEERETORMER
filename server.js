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
  CREATE TABLE IF NOT EXISTS PREVENTAS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente TEXT NOT NULL,
    telefono TEXT,
    fecha TEXT NOT NULL,
    total REAL NOT NULL DEFAULT 0.0,
    estado TEXT NOT NULL DEFAULT 'Pendiente',
    notas TEXT
  );

  CREATE TABLE IF NOT EXISTS DETALLE_DE_PREVENTAS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    preventa_id INTEGER NOT NULL,
    producto TEXT NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_unitario REAL NOT NULL DEFAULT 0.0,
    subtotal REAL NOT NULL DEFAULT 0.0,
    FOREIGN KEY (preventa_id) REFERENCES PREVENTAS(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS CLIENTES (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    telefono TEXT
  );

  CREATE TABLE IF NOT EXISTS STOCK (
    material TEXT PRIMARY KEY,
    precio REAL NOT NULL DEFAULT 0.0,
    concat TEXT NOT NULL
  );
`);

// Insert some realistic dummy data if tables are empty
const countPreventas = db.prepare('SELECT COUNT(*) as count FROM PREVENTAS').get();
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
    INSERT INTO STOCK (material, precio, concat)
    VALUES (?, ?, ?)
  `);
  db.transaction(() => {
    insertStock.run('Saco-01', 45.00, 'Saco de Alimento Premium Ovejas 25kg [Saco-01] - 45.00 €');
    insertStock.run('Sup-01', 40.50, 'Suplemento Vitamínico Ovino 5L [Sup-01] - 40.50 €');
    insertStock.run('Esq-01', 210.00, 'Esquiladora Profesional SheepCut [Esq-01] - 210.00 €');
    insertStock.run('Cuc-01', 20.00, 'Cuchillas de repuesto SheepCut 4T [Cuc-01] - 20.00 €');
    insertStock.run('Ide-01', 25.00, 'Identificadores de Oreja (Pack 100u) [Ide-01] - 25.00 €');
    insertStock.run('Ten-01', 35.00, 'Tenaza Aplicadora de Crotales [Ten-01] - 35.00 €');
    insertStock.run('PRI-000233', 0.10, 'PRI-000233 UNI TORNILLO PARA BISAGRA DE 1/2" Inventario en almacén 5980 - 0.10 €');
    insertStock.run('PRI-000148', 0.03, 'PRI-000148 PZA REMACHE POP 1/8X1/2 44523 Inventario en almacén 552 - 0.03 €');
  })();
}

if (countPreventas.count === 0) {
  console.log('Populating database with beautiful dummy data...');
  
  const insertPreventa = db.prepare(`
    INSERT INTO PREVENTAS (cliente, telefono, fecha, total, estado, notas)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertDetalle = db.prepare(`
    INSERT INTO DETALLE_DE_PREVENTAS (preventa_id, producto, cantidad, precio_unitario, subtotal)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Transaction to insert dummy pre-sales
  const insertDummyData = db.transaction(() => {
    // 1. Pre-sale 1
    const p1_res = insertPreventa.run(
      'María González',
      '+34 612 345 678',
      new Date(Date.now() - 3600000 * 24).toISOString().split('T')[0], // Yesterday
      175.50,
      'Pendiente',
      'Entregar preferiblemente en horario de tarde.'
    );
    const p1_id = p1_res.lastInsertRowid;
    insertDetalle.run(p1_id, 'Saco de Alimento Premium Ovejas 25kg', 3, 45.00, 135.00);
    insertDetalle.run(p1_id, 'Suplemento Vitamínico Ovino 5L', 1, 40.50, 40.50);

    // 2. Pre-sale 2
    const p2_res = insertPreventa.run(
      'Juan Martínez (Ganadera El Prado)',
      '+34 699 888 777',
      new Date().toISOString().split('T')[0], // Today
      520.00,
      'Completado',
      'Cliente habitual. Retira en tienda.'
    );
    const p2_id = p2_res.lastInsertRowid;
    insertDetalle.run(p2_id, 'Esquiladora Profesional SheepCut', 2, 210.00, 420.00);
    insertDetalle.run(p2_id, 'Cuchillas de repuesto SheepCut 4T', 5, 20.00, 100.00);

    // 3. Pre-sale 3
    const p3_res = insertPreventa.run(
      'Ana Isabel Ruiz',
      '+34 655 444 333',
      new Date().toISOString().split('T')[0], // Today
      85.00,
      'Pendiente',
      'Llamar antes de enviar.'
    );
    const p3_id = p3_res.lastInsertRowid;
    insertDetalle.run(p3_id, 'Identificadores de Oreja (Pack 100u)', 2, 25.00, 50.00);
    insertDetalle.run(p3_id, 'Tenaza Aplicadora de Crotales', 1, 35.00, 35.00);
  });

  insertDummyData();
  console.log('Database successfully populated.');
}

// AppSheet API Helper function
async function callAppSheetAPI(tableName, action, rows = [], selector = null) {
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
      return null;
    }

    const text = await response.text();
    if (!text || text.length === 0) {
      return [];
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse AppSheet response JSON:", e.message, "Response was:", text);
      return [];
    }
  } catch (error) {
    console.error(`Fetch error connecting to AppSheet API:`, error.message);
    return null;
  }
}

// Sync function to pull from AppSheet and update local SQLite cache
async function syncFromAppSheetToSQLite() {
  console.log('Attempting to fetch data from AppSheet...');
  const preventasFromAppSheet = await callAppSheetAPI("PREVENTAS", "Find");
  const detallesFromAppSheet = await callAppSheetAPI("DETALLE_DE_PREVENTAS", "Find");
  const clientesFromAppSheet = await callAppSheetAPI("clientes", "Find");
  const stockFromAppSheet = await callAppSheetAPI("stock", "Find");

  if (Array.isArray(preventasFromAppSheet) && preventasFromAppSheet.length > 0) {
    console.log(`Syncing ${preventasFromAppSheet.length} preventas from AppSheet...`);
    db.transaction(() => {
      // Clear local tables
      db.prepare('DELETE FROM DETALLE_DE_PREVENTAS').run();
      db.prepare('DELETE FROM PREVENTAS').run();

      const insertPreventa = db.prepare(`
        INSERT INTO PREVENTAS (id, cliente, telefono, fecha, total, estado, notas)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const insertDetalle = db.prepare(`
        INSERT INTO DETALLE_DE_PREVENTAS (id, preventa_id, producto, cantidad, precio_unitario, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const p of preventasFromAppSheet) {
        // Normalize keys to lowercase to be robust against AppSheet uppercase column mappings
        const pNormalized = {};
        for (const k of Object.keys(p)) {
          pNormalized[k.toLowerCase()] = p[k];
        }

        insertPreventa.run(
          parseInt(pNormalized.id),
          pNormalized.cliente || '',
          pNormalized.telefono || '',
          pNormalized.fecha || '',
          parseFloat(pNormalized.total) || 0.0,
          pNormalized.estado || 'Pendiente',
          pNormalized.notas || ''
        );
      }

      if (Array.isArray(detallesFromAppSheet)) {
        for (const d of detallesFromAppSheet) {
          const dNormalized = {};
          for (const k of Object.keys(d)) {
            dNormalized[k.toLowerCase()] = d[k];
          }

          insertDetalle.run(
            parseInt(dNormalized.id),
            parseInt(dNormalized.preventa_id),
            dNormalized.producto || '',
            parseInt(dNormalized.cantidad) || 0,
            parseFloat(dNormalized.precio_unitario) || 0.0,
            parseFloat(dNormalized.subtotal) || 0.0
          );
        }
      }

      // Sync CLIENTES if returned
      if (Array.isArray(clientesFromAppSheet) && clientesFromAppSheet.length > 0) {
        db.prepare('DELETE FROM CLIENTES').run();
        const insertCliente = db.prepare(`
          INSERT INTO CLIENTES (id, nombre, telefono)
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
          INSERT INTO STOCK (material, precio, concat)
          VALUES (?, ?, ?)
        `);
        for (const s of stockFromAppSheet) {
          const sNormalized = {};
          for (const k of Object.keys(s)) {
            sNormalized[k.toLowerCase()] = s[k];
          }
          const material = sNormalized.material || '';
          const precioVal = parseFloat(sNormalized.precio) || 0.0;
          const concat = sNormalized.concat || '';
          if (material && concat) {
            insertStock.run(material, precioVal, concat);
          }
        }
      }
    })();
    console.log('Local database synced with AppSheet successfully.');
  } else {
    console.log('AppSheet PREVENTAS table is empty or offline, using local SQLite cache.');
  }
}

// REST API Endpoints

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
    // Try syncing from AppSheet first
    await syncFromAppSheetToSQLite().catch(err => {
      console.warn("AppSheet Sync failed during GET, falling back to SQLite directly:", err.message);
    });

    const preventas = db.prepare('SELECT * FROM PREVENTAS ORDER BY fecha DESC, id DESC').all();
    
    // For each preventa, fetch its details
    const preventasWithDetails = preventas.map(p => {
      const details = db.prepare('SELECT * FROM DETALLE_DE_PREVENTAS WHERE preventa_id = ?').all(p.id);
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
    const preventa = db.prepare('SELECT * FROM PREVENTAS WHERE id = ?').get(id);
    
    if (!preventa) {
      return res.status(404).json({ error: 'Preventa no encontrada' });
    }
    
    const detalles = db.prepare('SELECT * FROM DETALLE_DE_PREVENTAS WHERE preventa_id = ?').all(id);
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
      const qty = parseInt(item.cantidad) || 0;
      const price = parseFloat(item.precio_unitario) || 0;
      return sum + (qty * price);
    }, 0);

    const insertPreventa = db.prepare(`
      INSERT INTO PREVENTAS (cliente, telefono, fecha, total, estado, notas)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertDetalle = db.prepare(`
      INSERT INTO DETALLE_DE_PREVENTAS (preventa_id, producto, cantidad, precio_unitario, subtotal)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Use transaction for safe local creation
    let newId;
    const executeTransaction = db.transaction(() => {
      const result = insertPreventa.run(
        cliente,
        telefono || '',
        fecha,
        totalCalculado,
        estado || 'Pendiente',
        notas || ''
      );
      newId = result.lastInsertRowid;

      for (const item of detalles) {
        if (!item.producto || item.cantidad <= 0 || item.precio_unitario < 0) {
          throw new Error('Detalles de producto inválidos: ' + JSON.stringify(item));
        }
        const subtotal = item.cantidad * item.precio_unitario;
        const detResult = insertDetalle.run(newId, item.producto, item.cantidad, item.precio_unitario, subtotal);
        item.id = detResult.lastInsertRowid; // Track the SQLite generated ID for the detail
      }
    });

    executeTransaction();

    // Now send the changes to AppSheet cloud backend
    const pRow = {
      id: String(newId),
      cliente: cliente,
      telefono: telefono || '',
      fecha: fecha,
      total: String(totalCalculado),
      estado: estado || 'Pendiente',
      notas: notas || ''
    };

    // Call Add action on AppSheet for PREVENTAS
    await callAppSheetAPI("PREVENTAS", "Add", [pRow]).catch(err => {
      console.error("AppSheet API PREVENTAS Add failed:", err.message);
    });

    // Call Add action on AppSheet for DETALLE_DE_PREVENTAS
    const dRows = detalles.map(item => ({
      id: String(item.id),
      preventa_id: String(newId),
      producto: item.producto,
      cantidad: String(item.cantidad),
      precio_unitario: String(item.precio_unitario),
      subtotal: String(item.cantidad * item.precio_unitario)
    }));

    await callAppSheetAPI("DETALLE_DE_PREVENTAS", "Add", dRows).catch(err => {
      console.error("AppSheet API DETALLE_DE_PREVENTAS Add failed:", err.message);
    });

    // Fetch and return the newly created preventa
    const createdPreventa = db.prepare('SELECT * FROM PREVENTAS WHERE id = ?').get(newId);
    const createdDetails = db.prepare('SELECT * FROM DETALLE_DE_PREVENTAS WHERE preventa_id = ?').all(newId);
    
    res.status(201).json({ ...createdPreventa, detalles: createdDetails });
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
    const existing = db.prepare('SELECT id FROM PREVENTAS WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Preventa no encontrada' });
    }

    const totalCalculado = detalles.reduce((sum, item) => {
      const qty = parseInt(item.cantidad) || 0;
      const price = parseFloat(item.precio_unitario) || 0;
      return sum + (qty * price);
    }, 0);

    const updatePreventa = db.prepare(`
      UPDATE PREVENTAS
      SET cliente = ?, telefono = ?, fecha = ?, total = ?, estado = ?, notas = ?
      WHERE id = ?
    `);

    const deleteDetalles = db.prepare('DELETE FROM DETALLE_DE_PREVENTAS WHERE preventa_id = ?');
    const insertDetalle = db.prepare(`
      INSERT INTO DETALLE_DE_PREVENTAS (preventa_id, producto, cantidad, precio_unitario, subtotal)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Retrieve old detail IDs from SQLite so we can delete them from AppSheet
    const oldDetails = db.prepare('SELECT id FROM DETALLE_DE_PREVENTAS WHERE preventa_id = ?').all(id);

    // Perform inside transaction locally
    const executeTransaction = db.transaction(() => {
      updatePreventa.run(cliente, telefono || '', fecha, totalCalculado, estado || 'Pendiente', notas || '', id);
      deleteDetalles.run(id);

      for (const item of detalles) {
        if (!item.producto || item.cantidad <= 0 || item.precio_unitario < 0) {
          throw new Error('Detalles de producto inválidos: ' + JSON.stringify(item));
        }
        const subtotal = item.cantidad * item.precio_unitario;
        const detResult = insertDetalle.run(id, item.producto, item.cantidad, item.precio_unitario, subtotal);
        item.id = detResult.lastInsertRowid; // Track the new generated ID
      }
    });

    executeTransaction();

    // Now update AppSheet cloud tables
    const pRow = {
      id: String(id),
      cliente: cliente,
      telefono: telefono || '',
      fecha: fecha,
      total: String(totalCalculado),
      estado: estado || 'Pendiente',
      notas: notas || ''
    };

    // Call Edit action on AppSheet for PREVENTAS
    await callAppSheetAPI("PREVENTAS", "Edit", [pRow]).catch(err => {
      console.error("AppSheet API PREVENTAS Edit failed:", err.message);
    });

    // Delete old details on AppSheet
    if (oldDetails.length > 0) {
      const deleteRows = oldDetails.map(d => ({ id: String(d.id) }));
      await callAppSheetAPI("DETALLE_DE_PREVENTAS", "Delete", deleteRows).catch(err => {
        console.error("AppSheet API DETALLE_DE_PREVENTAS Delete failed:", err.message);
      });
    }

    // Add new details on AppSheet
    const dRows = detalles.map(item => ({
      id: String(item.id),
      preventa_id: String(id),
      producto: item.producto,
      cantidad: String(item.cantidad),
      precio_unitario: String(item.precio_unitario),
      subtotal: String(item.cantidad * item.precio_unitario)
    }));

    await callAppSheetAPI("DETALLE_DE_PREVENTAS", "Add", dRows).catch(err => {
      console.error("AppSheet API DETALLE_DE_PREVENTAS Add failed:", err.message);
    });

    // Fetch and return the updated preventa
    const updatedPreventa = db.prepare('SELECT * FROM PREVENTAS WHERE id = ?').get(id);
    const updatedDetails = db.prepare('SELECT * FROM DETALLE_DE_PREVENTAS WHERE preventa_id = ?').all(id);
    
    res.json({ ...updatedPreventa, detalles: updatedDetails });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la preventa: ' + err.message });
  }
});

// DELETE /api/preventas/:id - Delete a pre-sale
app.delete('/api/preventas/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const existing = db.prepare('SELECT id FROM PREVENTAS WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Preventa no encontrada' });
    }

    // Retrieve old detail IDs from SQLite so we can delete them from AppSheet
    const oldDetails = db.prepare('SELECT id FROM DETALLE_DE_PREVENTAS WHERE preventa_id = ?').all(id);

    // Cascade delete is active due to FOREIGN KEY ... ON DELETE CASCADE locally
    db.prepare('DELETE FROM PREVENTAS WHERE id = ?').run(id);

    // Update AppSheet Cloud Tables
    // Delete associated details first on AppSheet
    if (oldDetails.length > 0) {
      const deleteRows = oldDetails.map(d => ({ id: String(d.id) }));
      await callAppSheetAPI("DETALLE_DE_PREVENTAS", "Delete", deleteRows).catch(err => {
        console.error("AppSheet API DETALLE_DE_PREVENTAS Delete failed:", err.message);
      });
    }

    // Delete parent row from AppSheet
    await callAppSheetAPI("PREVENTAS", "Delete", [{ id: String(id) }]).catch(err => {
      console.error("AppSheet API PREVENTAS Delete failed:", err.message);
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
        sheet_name: "PREVENTAS",
        columns: ["id", "cliente", "telefono", "fecha", "total", "estado", "notas"],
        appsheet_type: "Parent Table (Key: id)"
      },
      {
        sheet_name: "DETALLE_DE_PREVENTAS",
        columns: ["id", "preventa_id", "producto", "cantidad", "precio_unitario", "subtotal"],
        appsheet_type: "Child Table (Key: id, Ref: preventa_id -> PREVENTAS)"
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
