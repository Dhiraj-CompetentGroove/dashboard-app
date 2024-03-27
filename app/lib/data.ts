//import { sql } from '@vercel/postgres';
import { unstable_noStore as noStore } from 'next/cache';
const { Pool } = require('pg');

//const { Pool } = require('pg-promise');

const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'dev',
  password: 'qwertyuiop',
  port: 5432,
});


import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  User,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';

export async function fetchRevenue() {
  // Add noStore() here to prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  noStore();

  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    //const data = await sql<Revenue>`SELECT * FROM revenue`;
    const queryText = 'SELECT * FROM revenue';
    const data = await pool.query(queryText);
    //console.log(data.rows);

    console.log('Data fetch completed after 3 seconds.');

    return data.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  noStore();
  try {
    // const data = await sql<LatestInvoiceRaw>`
    //   SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
    //   FROM invoices
    //   JOIN customers ON invoices.customer_id = customers.id
    //   ORDER BY invoices.date DESC
    //   LIMIT 5`;
    
    const queryText ="SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id FROM invoices JOIN customers ON invoices.customer_id = customers.id ORDER BY invoices.date DESC LIMIT 5";
    const data = await pool.query(queryText);
    const latestInvoices = data.rows.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  noStore();
  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    // const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
    // const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
    // const invoiceStatusPromise = sql`SELECT
    //      SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
    //      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
    //      FROM invoices`;

    const invoiceCountSql = "SELECT COUNT(*) FROM invoices";
    const customerCountSql = "SELECT COUNT(*) FROM customers";
    const invoiceStatusSql = "SELECT SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS paid, SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS pending FROM invoices";

    // const data = await Promise.all([
    //   invoiceCountPromise,
    //   customerCountPromise,
    //   invoiceStatusPromise,
    // ]);

    const invoiceCount = await pool.query(invoiceCountSql);
    //console.log(invoiceCount);
    const customerCount = await pool.query(customerCountSql);
    //console.log(customerCount);
    const invoiceStatus = await pool.query(invoiceStatusSql);
    //console.log(invoiceStatus);
    
    // const data = await Promise.all([
    //   invoiceCountSql,
    //   customerCountSql,
    //   invoiceStatusSql,
    // ]);

    // console.log(data)



    const numberOfInvoices = Number(invoiceCount.rows[0].count ?? '0');
    const numberOfCustomers = Number(customerCount.rows[0].count ?? '0');
    const totalPaidInvoices = formatCurrency(invoiceStatus.rows[0].paid ?? '0');
    const totalPendingInvoices = formatCurrency(invoiceStatus.rows[0].pending ?? '0');

    // const numberOfInvoices = Number(data[0].rows[0].count ?? '0');
    // const numberOfCustomers = Number(data[1].rows[0].count ?? '0');
    // const totalPaidInvoices = formatCurrency(data[2].rows[0].paid ?? '0');
    // const totalPendingInvoices = formatCurrency(data[2].rows[0].pending ?? '0');

    //console.log(numberOfInvoices);
    //console.log(numberOfCustomers);
    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    // const invoices = await sql<InvoicesTable>`
    //   SELECT
    //     invoices.id,
    //     invoices.amount,
    //     invoices.date,
    //     invoices.status,
    //     customers.name,
    //     customers.email,
    //     customers.image_url
    //   FROM invoices
    //   JOIN customers ON invoices.customer_id = customers.id
    //   WHERE
    //     customers.name ILIKE ${`%${query}%`} OR
    //     customers.email ILIKE ${`%${query}%`} OR
    //     invoices.amount::text ILIKE ${`%${query}%`} OR
    //     invoices.date::text ILIKE ${`%${query}%`} OR
    //     invoices.status ILIKE ${`%${query}%`}
    //   ORDER BY invoices.date DESC
    //   LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    // `;

    const invoicesSql = `SELECT invoices.id, invoices.amount, invoices.date, invoices.status, customers.name, customers.email, customers.image_url FROM invoices JOIN customers ON invoices.customer_id = customers.id WHERE customers.name LIKE '${`%${query}%`}' OR customers.email LIKE '${`%${query}%`}' OR invoices.amount::text LIKE '${`%${query}%`}' OR invoices.date::text LIKE '${`%${query}%`}' OR invoices.status LIKE '${`%${query}%`}' ORDER BY invoices.date DESC LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}`;

    
    const invoices = await pool.query(invoicesSql);

    return invoices.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  noStore();
  try {
    const countSql = `SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name LIKE '${`%${query}%`}' OR
      customers.email LIKE '${`%${query}%`}' OR
      invoices.amount::text LIKE '${`%${query}%`}' OR
      invoices.date::text LIKE '${`%${query}%`}' OR
      invoices.status LIKE '${`%${query}%`}'
  `;

    console.log(countSql);

    const count = await pool.query(countSql);
    const totalPages = Math.ceil(Number(count.rows[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  noStore();
  try {
    const dataSql = `
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = '${id}';
    `;

    console.log(dataSql);
    const data = await pool.query(dataSql);
    const invoice = data.rows.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  try {
    const dataSql = `
      SELECT
        id,
        nameF
      FROM customers
      ORDER BY name ASC
    `;

    const data = await pool.query(dataSql);
    const customers = data.rows;
    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  noStore();
  try {
    const data = await pool.query(`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name LIKE '${`%${query}%`}' OR
        customers.email LIKE '${`%${query}%`}'
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `);

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}

export async function getUser(email: string) {
  try {
    const userSql=`SELECT * FROM users WHERE email=${email}`;
    console.log(userSql);
    const user = await pool.query(userSql);
    return user.rows[0] as User;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}
