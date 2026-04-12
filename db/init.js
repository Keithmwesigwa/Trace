require('dotenv').config();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function initDB() {
    try {
        console.log('Disabling foreign key checks...');
        await db.query('SET FOREIGN_KEY_CHECKS = 0');

        console.log('Dropping existing tables...');
        await db.query('DROP TABLE IF EXISTS wishlists');
        await db.query('DROP TABLE IF EXISTS ratings');
        await db.query('DROP TABLE IF EXISTS products');
        await db.query('DROP TABLE IF EXISTS categories');
        await db.query('DROP TABLE IF EXISTS users');

        console.log('Creating users table...');
        await db.query(`
            CREATE TABLE users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100),
                email VARCHAR(150) UNIQUE,
                password VARCHAR(255),
                contact VARCHAR(20),
                role ENUM('user','admin') DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Creating categories table...');
        await db.query(`
            CREATE TABLE categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100),
                icon VARCHAR(50)
            )
        `);

        console.log('Creating products table...');
        await db.query(`
            CREATE TABLE products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(200),
                brand VARCHAR(100),
                category_id INT,
                price DECIMAL(10,2),
                description TEXT,
                specs JSON,
                images JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id)
            )
        `);

        console.log('Creating wishlists table...');
        await db.query(`
            CREATE TABLE wishlists (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                product_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                UNIQUE KEY (user_id, product_id)
            )
        `);

        console.log('Creating ratings table...');
        await db.query(`
            CREATE TABLE ratings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                score INT,
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        console.log('Seeding data...');
        // Admin user
        const hashed = await bcrypt.hash('Admin1234!', 12);
        await db.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', 
            ['Admin', 'admin@shop.com', hashed, 'admin']);

        // Categories
        await db.query("INSERT INTO categories (name, icon) VALUES ('Laptops', '💻'), ('Phones', '📱'), ('Power Banks', '🔋'), ('Accessories', '🎧')");

        // Some sample products
        const [cats] = await db.query('SELECT * FROM categories');
        const phoneCatId = cats.find(c => c.name === 'Phones').id;
        const laptopCatId = cats.find(c => c.name === 'Laptops').id;

        await db.query(`
            INSERT INTO products (name, brand, category_id, price, description, specs, images)
            VALUES 
            (?, ?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?, ?)
        `, [
            'iPhone 15 Pro Max', 'Apple', phoneCatId, 1199.99, 
            'The ultimate iPhone with titanium design and A17 Pro chip.', 
            JSON.stringify({ screen: '6.7" OLED', battery: '4422 mAh', camera: '48MP Main' }), 
            JSON.stringify(['https://res.cloudinary.com/dpgf8pzuo/image/upload/v1713531000/iphone15pro_s8jh7b.jpg']),

            'ThinkPad X1 Carbon Gen 11', 'Lenovo', laptopCatId, 1450.00, 
            'Premium business laptop with incredible keyboard and light weight.', 
            JSON.stringify({ cpu: 'Intel Core i7-1355U', ram: '16GB LPDDR5', storage: '512GB SSD', screen: '14" WUXGA' }), 
            JSON.stringify([])
        ]);

        console.log('Enabling foreign key checks...');
        await db.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('Database initialized successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error initializing database:', err);
        process.exit(1);
    }
}

initDB();
