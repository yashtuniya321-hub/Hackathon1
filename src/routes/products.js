import express from 'express';
import { query } from '../config/db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all products with attached variants
router.get('/', authenticateToken, async (req, res) => {
  try {
    const productsRes = await query(`SELECT * FROM products ORDER BY name ASC`);
    const variantsRes = await query(`SELECT * FROM product_variants ORDER BY price_extra ASC`);

    const products = productsRes.rows.map(prod => ({
      ...prod,
      sales_price: Number(prod.sales_price),
      cost_price: Number(prod.cost_price),
      variants: variantsRes.rows
        .filter(v => v.product_id === prod.id)
        .map(v => ({
          ...v,
          price_extra: Number(v.price_extra)
        }))
    }));

    return res.apiSuccess(products);
  } catch (err) {
    return res.apiError('Failed to fetch products: ' + err.message, 500);
  }
});

// Get single product by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const prodRes = await query(`SELECT * FROM products WHERE id = $1`, [id]);
    if (prodRes.rows.length === 0) {
      return res.apiError('Product not found.', 404);
    }

    const variantsRes = await query(`SELECT * FROM product_variants WHERE product_id = $1`, [id]);
    const product = {
      ...prodRes.rows[0],
      sales_price: Number(prodRes.rows[0].sales_price),
      cost_price: Number(prodRes.rows[0].cost_price),
      variants: variantsRes.rows.map(v => ({ ...v, price_extra: Number(v.price_extra) }))
    };

    return res.apiSuccess(product);
  } catch (err) {
    return res.apiError('Failed to fetch product: ' + err.message, 500);
  }
});

// Create product - ADMIN ONLY
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, type = 'Software', sales_price = 0, cost_price = 0, notes = '', variants = [] } = req.body;

    if (!name) {
      return res.apiError('Product name is required.', 400);
    }

    const prodId = `prod-${Date.now().toString().slice(-6)}`;
    const prodRes = await query(
      `INSERT INTO products (id, name, type, sales_price, cost_price, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [prodId, name, type, Number(sales_price) || 0, Number(cost_price) || 0, notes]
    );

    const insertedVariants = [];
    if (Array.isArray(variants) && variants.length > 0) {
      for (const v of variants) {
        const vId = `var-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const vRes = await query(
          `INSERT INTO product_variants (id, product_id, name, brand, price_extra)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [vId, prodId, v.name, v.brand || 'Standard', Number(v.price_extra) || 0]
        );
        insertedVariants.push({ ...vRes.rows[0], price_extra: Number(vRes.rows[0].price_extra) });
      }
    }

    const product = {
      ...prodRes.rows[0],
      sales_price: Number(prodRes.rows[0].sales_price),
      cost_price: Number(prodRes.rows[0].cost_price),
      variants: insertedVariants
    };

    return res.status(201).apiSuccess(product, `Product "${name}" created.`);
  } catch (err) {
    return res.apiError('Failed to create product: ' + err.message, 500);
  }
});

// Update product - ADMIN ONLY
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, sales_price, cost_price, notes } = req.body;

    const updateRes = await query(
      `UPDATE products 
       SET name = COALESCE($1, name),
           type = COALESCE($2, type),
           sales_price = COALESCE($3, sales_price),
           cost_price = COALESCE($4, cost_price),
           notes = COALESCE($5, notes)
       WHERE id = $6
       RETURNING *`,
      [name, type, sales_price !== undefined ? Number(sales_price) : null, cost_price !== undefined ? Number(cost_price) : null, notes, id]
    );

    if (updateRes.rows.length === 0) {
      return res.apiError('Product not found.', 404);
    }

    return res.apiSuccess(updateRes.rows[0], 'Product updated.');
  } catch (err) {
    return res.apiError('Failed to update product: ' + err.message, 500);
  }
});

// Delete product - ADMIN ONLY
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleteRes = await query(`DELETE FROM products WHERE id = $1 RETURNING id, name`, [id]);
    if (deleteRes.rows.length === 0) {
      return res.apiError('Product not found.', 404);
    }
    return res.apiSuccess({ id }, `Product "${deleteRes.rows[0].name}" removed.`);
  } catch (err) {
    return res.apiError('Failed to delete product: ' + err.message, 500);
  }
});

// Add Variant to Product - ADMIN ONLY
router.post('/:id/variants', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id: product_id } = req.params;
    const { name, brand = 'Standard', price_extra = 0 } = req.body;

    if (!name) {
      return res.apiError('Variant name is required.', 400);
    }

    const varId = `var-${Date.now().toString().slice(-6)}`;
    const vRes = await query(
      `INSERT INTO product_variants (id, product_id, name, brand, price_extra)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [varId, product_id, name, brand, Number(price_extra) || 0]
    );

    return res.status(201).apiSuccess(
      { ...vRes.rows[0], price_extra: Number(vRes.rows[0].price_extra) },
      `Variant "${name}" added to product.`
    );
  } catch (err) {
    return res.apiError('Failed to add variant: ' + err.message, 500);
  }
});

// Delete Variant - ADMIN ONLY
router.delete('/variants/:variantId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { variantId } = req.params;
    const deleteRes = await query(`DELETE FROM product_variants WHERE id = $1 RETURNING id, name`, [variantId]);
    if (deleteRes.rows.length === 0) {
      return res.apiError('Variant not found.', 404);
    }
    return res.apiSuccess({ id: variantId }, 'Variant removed.');
  } catch (err) {
    return res.apiError('Failed to delete variant: ' + err.message, 500);
  }
});

export default router;
