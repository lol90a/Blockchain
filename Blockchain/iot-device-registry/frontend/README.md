# IoT Device Registry Frontend

A simple React frontend for managing IoT devices through the Hyperledger Fabric backend.

## Features

- ✅ Register new IoT devices
- ✅ View all registered devices
- ✅ Update device information
- ✅ Activate/deactivate devices
- ✅ Delete devices
- ✅ Real-time Fabric connection status
- ✅ Responsive design
- ✅ Error handling and user feedback

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Backend server running on port 5000

## Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## Usage

### Register a Device
1. Fill in the device details in the "Register New Device" form
2. Click "Register Device"
3. The device will be added to the blockchain

### View Devices
- All registered devices are displayed in the "Registered Devices" section
- Click "Refresh Devices" to reload the list
- Click "View Details" to see complete device information

### Update a Device
1. Enter the device ID in the "Update Device" section
2. Fill in the new information you want to update
3. Click "Update Device"

### Device Management
- **Activate**: Change device status to active
- **Deactivate**: Change device status to inactive
- **Delete**: Remove device from the registry (with confirmation)

## API Endpoints Used

The frontend connects to these backend endpoints:

- `GET /api/devices` - Get all devices
- `POST /api/devices/register` - Register new device
- `GET /api/devices/:id` - Get specific device
- `PUT /api/devices/:id` - Update device
- `POST /api/devices/:id/activate` - Activate device
- `POST /api/devices/:id/deactivate` - Deactivate device
- `DELETE /api/devices/:id` - Delete device

## Status Indicators

- **✅ Connected to Hyperledger Fabric Network**: Backend is successfully connected to the live Fabric network
- The project is configured for Fabric-only runtime and does not use mock mode

## Troubleshooting

### Frontend won't start
- Make sure you're in the `frontend` directory
- Run `npm install` to install dependencies
- Check that port 3000 is available

### Can't connect to backend
- Ensure the backend server is running on port 5000
- Check that the backend is accessible at `http://localhost:5000`
- Verify the proxy setting in `package.json`

### No devices showing
- Check the backend logs for errors
- Verify Fabric network is running
- Try refreshing the device list

## Storage Notes

- Device registry records are stored on Hyperledger Fabric
- Device NFT assets are stored on Hyperledger Fabric
- Frontend session tokens are kept in browser `localStorage`
- Admin and application user-management data in this project is still handled by the backend application layer, not by Fabric

## Development

### Project Structure
```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── App.js          # Main application component
│   ├── App.css         # Component styles
│   ├── index.js        # React entry point
│   └── index.css       # Global styles
├── package.json
└── README.md
```

### Adding New Features
1. Modify `App.js` to add new functionality
2. Update styles in `App.css` or `index.css`
3. Test with the backend API
4. Update this README if needed

## Build for Production

```bash
npm run build
```

This creates a `build` folder with optimized production files. 
