const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
`);

// Insert some realistic dummy data if tables are empty
const countPreventas = db.prepare('SELECT COUNT(*) as count FROM PREVENTAS').get();

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

// REST API Endpoints

// GET /api/preventas - Get all pre-sales
app.get('/api/preventas', (req, res) => {
  try {
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
app.post('/api/preventas', (req, res) => {
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

    // Use transaction for safe creation
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
        insertDetalle.run(newId, item.producto, item.cantidad, item.precio_unitario, subtotal);
      }
    });

    executeTransaction();

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
app.put('/api/preventas/:id', (req, res) => {
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

    // Perform inside transaction
    const executeTransaction = db.transaction(() => {
      updatePreventa.run(cliente, telefono || '', fecha, totalCalculado, estado || 'Pendiente', notas || '', id);
      deleteDetalles.run(id);

      for (const item of detalles) {
        if (!item.producto || item.cantidad <= 0 || item.precio_unitario < 0) {
          throw new Error('Detalles de producto inválidos: ' + JSON.stringify(item));
        }
        const subtotal = item.cantidad * item.precio_unitario;
        insertDetalle.run(id, item.producto, item.cantidad, item.precio_unitario, subtotal);
      }
    });

    executeTransaction();

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
app.delete('/api/preventas/:id', (req, res) => {
  const id = req.params.id;
  try {
    const existing = db.prepare('SELECT id FROM PREVENTAS WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Preventa no encontrada' });
    }

    // Cascade delete is active due to FOREIGN KEY ... ON DELETE CASCADE
    db.prepare('DELETE FROM PREVENTAS WHERE id = ?').run(id);
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

app.post('/api/appsheet-sync', (req, res) => {
  // Simulate AppSheet webhook trigger or spreadsheet push
  res.json({
    success: true,
    message: "Sincronización bidireccional exitosa con las Hojas de Cálculo de Google (App Sheep).",
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
