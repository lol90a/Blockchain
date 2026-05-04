Import these two files into Postman:

- `IoT-Device-Registry.postman_collection.json`
- `IoT-Device-Registry.postman_environment.json`

Recommended run order:

1. `Health Check`
2. `Encrypt Data`
3. `Decrypt Data`
4. `Register User`
5. `Login User`
6. `Get User Profile`
7. `Login Admin`
8. Device endpoints in order from `Register Device` to `Delete Device`

Notes:

- The collection stores `userToken`, `adminToken`, and `encryptedToken` automatically.
- Default base URL is `http://localhost:5000`.
- `Verify Device NFT` is expected to return a deterministic Fabric-backed verification result.
- Device and NFT ledger records are expected to come from the live Fabric network.
