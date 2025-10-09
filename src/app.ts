import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectToDatabase, getDb } from './config/database';
import { ObjectId } from 'mongodb';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
connectToDatabase();

// ===== BASIC ROUTES =====
app.get('/', (req, res) => {
  res.json({ 
    message: 'RideBite Server is running!',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    database: 'Connected',
    timestamp: new Date().toISOString()
  });
});

// ===== FOOD DELIVERY ROUTES =====

// Get all restaurants
app.get('/api/restaurants', async (req, res) => {
  try {
    const db = getDb();
    const restaurants = await db.collection('restaurants').find().toArray();
    
    res.json({
      success: true,
      data: restaurants,
      count: restaurants.length
    });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch restaurants' 
    });
  }
});

// Get single restaurant by ID
app.get('/api/restaurants/:id', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    
    const restaurant = await db.collection('restaurants').findOne({ 
      _id: new ObjectId(id) 
    });
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    res.json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch restaurant' 
    });
  }
});

// Get menu items for a restaurant
app.get('/api/restaurants/:id/menu', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    
    const menuItems = await db.collection('menu_items').find({ 
      restaurantId: new ObjectId(id) 
    }).toArray();
    
    res.json({
      success: true,
      data: menuItems,
      count: menuItems.length
    });
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch menu items' 
    });
  }
});

// Place a new order
app.post('/api/orders', async (req, res) => {
  try {
    const { restaurantId, items, customerName, customerAddress, customerPhone, totalAmount } = req.body;
    
    // Basic validation
    if (!restaurantId || !items || !customerName || !totalAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: restaurantId, items, customerName, totalAmount'
      });
    }

    const db = getDb();
    
    // Generate order ID
    const orderId = 'RB' + Date.now();
    const estimatedDelivery = new Date(Date.now() + 45 * 60000); // 45 minutes from now
    
    const orderData = {
      orderId,
      restaurantId: new ObjectId(restaurantId),
      items,
      customerName,
      customerAddress: customerAddress || '',
      customerPhone: customerPhone || '',
      totalAmount: parseFloat(totalAmount),
      status: 'confirmed',
      createdAt: new Date(),
      estimatedDelivery
    };

    const result = await db.collection('orders').insertOne(orderData);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        orderId,
        orderNumber: result.insertedId,
        estimatedDelivery,
        totalAmount
      }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to place order' 
    });
  }
});

// Get order by ID
app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const db = getDb();
    const { orderId } = req.params;
    
    const order = await db.collection('orders').findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Get restaurant details
    const restaurant = await db.collection('restaurants').findOne({ 
      _id: order.restaurantId 
    });

    res.json({
      success: true,
      data: {
        ...order,
        restaurantName: restaurant?.name || 'Unknown Restaurant'
      }
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch order' 
    });
  }
});

// Delete restaurant
app.delete('/api/restaurants/:id', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    
    const result = await db.collection('restaurants').deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    // Also delete associated menu items
    await db.collection('menu_items').deleteMany({ restaurantId: new ObjectId(id) });

    res.json({
      success: true,
      message: 'Restaurant deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete restaurant' 
    });
  }
});

// Delete menu item
app.delete('/api/menu-items/:id', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    
    const result = await db.collection('menu_items').deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    res.json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete menu item' 
    });
  }
});

app.get('/api/menu-items', async (req, res) => {
  try {
    const db = getDb();
    const menuItems = await db.collection('menu_items').find().toArray();
    
    res.json({
      success: true,
      data: menuItems,
      count: menuItems.length
    });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch menu items' 
    });
  }
});

// ===== RIDE SHARING ROUTES =====

// Book a new ride
app.post('/api/rides', async (req, res) => {
  try {
    const { customerName, pickup, destination, vehicleType } = req.body;
    
    // Basic validation
    if (!customerName || !pickup || !destination || !vehicleType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customerName, pickup, destination, vehicleType'
      });
    }

    // Validate vehicle type
    const validVehicleTypes = ['car', 'bike', 'auto'];
    if (!validVehicleTypes.includes(vehicleType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid vehicle type. Must be: car, bike, or auto'
      });
    }

    const db = getDb();
    
    // Generate random driver name and fare based on vehicle type
    const drivers = {
      car: ['John Smith', 'Sarah Johnson', 'Mike Davis', 'Emily Wilson', 'David Brown'],
      bike: ['Alex Rider', 'Sam Wilson', 'Taylor Swift', 'Chris Evans'],
      auto: ['Raj Kumar', 'Amit Sharma', 'Priya Singh', 'Vikram Patel']
    };

    const baseFares = {
      car: { min: 8, max: 25 },
      bike: { min: 3, max: 12 },
      auto: { min: 5, max: 15 }
    };

    const vehicleDrivers = drivers[vehicleType as keyof typeof drivers];
    const fareRange = baseFares[vehicleType as keyof typeof baseFares];
    
    const driverName = vehicleDrivers[Math.floor(Math.random() * vehicleDrivers.length)];
    const fare = Math.floor(Math.random() * (fareRange.max - fareRange.min + 1)) + fareRange.min;
    
    // Calculate estimated arrival (5-15 minutes from now)
    const estimatedArrival = new Date(Date.now() + (5 + Math.random() * 10) * 60000);
    
    const rideData = {
      customerName,
      pickup,
      destination,
      vehicleType,
      driverName,
      fare,
      estimatedArrival,
      status: 'confirmed',
      createdAt: new Date()
    };

    const result = await db.collection('rides').insertOne(rideData);

    // Get the inserted ride with its ID
    const insertedRide = await db.collection('rides').findOne({ _id: result.insertedId });

    res.status(201).json({
      success: true,
      message: 'Ride booked successfully',
      data: insertedRide
    });
  } catch (error) {
    console.error('Error booking ride:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to book ride' 
    });
  }
});

// Get all rides (for admin)
app.get('/api/rides', async (req, res) => {
  try {
    const db = getDb();
    const rides = await db.collection('rides').find().sort({ createdAt: -1 }).toArray();
    
    res.json({
      success: true,
      data: rides,
      count: rides.length
    });
  } catch (error) {
    console.error('Error fetching rides:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch rides' 
    });
  }
});

// Get single ride by ID
app.get('/api/rides/:id', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    
    const ride = await db.collection('rides').findOne({ _id: new ObjectId(id) });
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found'
      });
    }

    res.json({
      success: true,
      data: ride
    });
  } catch (error) {
    console.error('Error fetching ride:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch ride' 
    });
  }
});

// Get rides by customer name
app.get('/api/rides/customer/:customerName', async (req, res) => {
  try {
    const db = getDb();
    const { customerName } = req.params;
    
    const rides = await db.collection('rides')
      .find({ customerName: new RegExp(customerName, 'i') })
      .sort({ createdAt: -1 })
      .toArray();
    
    res.json({
      success: true,
      data: rides,
      count: rides.length
    });
  } catch (error) {
    console.error('Error fetching customer rides:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch customer rides' 
    });
  }
});

// Update ride status
app.patch('/api/rides/:id/status', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['confirmed', 'driver_assigned', 'picked_up', 'in_progress', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: confirmed, driver_assigned, picked_up, in_progress, completed, cancelled'
      });
    }

    const result = await db.collection('rides').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found'
      });
    }

    const updatedRide = await db.collection('rides').findOne({ _id: new ObjectId(id) });

    res.json({
      success: true,
      message: 'Ride status updated successfully',
      data: updatedRide
    });
  } catch (error) {
    console.error('Error updating ride status:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update ride status' 
    });
  }
});

// Get all raiders (for admin dashboard)
app.get('/api/raiders', async (req, res) => {
  try {
    const db = getDb();
    const raiders = await db.collection('raiders').find().toArray();
    
    res.json({
      success: true,
      data: raiders,
      count: raiders.length
    });
  } catch (error) {
    console.error('Error fetching raiders:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch raiders' 
    });
  }
});

// Add new raider
app.post('/api/raiders', async (req, res) => {
  try {
    const db = getDb();
    const raiderData = {
      ...req.body,
      status: "available",
      isActive: true,
      totalDeliveries: 0,
      rating: 0,
      joinedDate: new Date(),
      lastActive: new Date()
    };

    const result = await db.collection('raiders').insertOne(raiderData);
    
    res.status(201).json({
      success: true,
      message: 'Raider added successfully',
      data: { ...raiderData, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error adding raider:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to add raider' 
    });
  }
});

// Update raider
app.put('/api/raiders/:id', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    
    const result = await db.collection('raiders').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...req.body, lastActive: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Raider not found'
      });
    }

    res.json({
      success: true,
      message: 'Raider updated successfully'
    });
  } catch (error) {
    console.error('Error updating raider:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update raider' 
    });
  }
});

// Delete raider
app.delete('/api/raiders/:id', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    
    const result = await db.collection('raiders').deleteOne(
      { _id: new ObjectId(id) }
    );

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Raider not found'
      });
    }

    res.json({
      success: true,
      message: 'Raider deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting raider:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete raider' 
    });
  }
});

// ===== ERROR HANDLING =====

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`🚗 RideBite Server running on port ${PORT}`);
});

export default app;