'use strict';

const { Contract } = require('fabric-contract-api');

class DeviceContract extends Contract {
  _nftKey(tokenId) {
    return `NFT:${tokenId}`;
  }

  async initLedger(ctx) {
    console.log('Ledger initialized');
    return 'Ledger initialized successfully';
  }

  async registerDevice(ctx, deviceId, type, manufacturer, registeredBy, publicKey, serialNumber, hardwareId, macAddress, model, nftIdentityJson) {
    serialNumber = serialNumber ?? '';
    hardwareId = hardwareId ?? '';
    macAddress = macAddress ?? '';
    model = model ?? '';
    nftIdentityJson = nftIdentityJson ?? '';
    const timestamp = new Date(ctx.stub.getTxTimestamp().seconds.low * 1000).toISOString();
    const txId = ctx.stub.getTxID();
    const device = {
      deviceId,
      type,
      manufacturer,
      registeredBy,
      publicKey,
      serialNumber,
      hardwareId,
      macAddress,
      model,
      status: 'active',
      timestamp,
      ledgerProof: {
        registrationTxId: txId,
        registrationBlockNumber: null,
        registrationTimestamp: timestamp,
        lastOperation: 'register'
      }
    };

    if (nftIdentityJson) {
      device.nftIdentity = JSON.parse(nftIdentityJson);
    }

    await ctx.stub.putState(deviceId, Buffer.from(JSON.stringify(device)));
    return JSON.stringify(device);
  }

  async getDevice(ctx, deviceId) {
    const deviceBytes = await ctx.stub.getState(deviceId);
    if (!deviceBytes || deviceBytes.length === 0) {
      throw new Error(`Device ${deviceId} does not exist`);
    }
    return deviceBytes.toString();
  }

  async getAllDevices(ctx) {
    const allResults = [];

    for await (const { key, value } of ctx.stub.getStateByRange('', '')) {
      if (key.startsWith('NFT:')) {
        continue;
      }

      const strValue = Buffer.from(value).toString('utf8');
      let record;
      try {
        record = JSON.parse(strValue);
      } catch (error) {
        record = strValue;
      }
      allResults.push(record.Key ? record : { Key: key, Record: record });
    }

    return JSON.stringify(allResults);
  }

  async mintDeviceNFT(ctx, deviceId, nftIdentityJson, ownerId) {
    const device = await this._getParsedDevice(ctx, deviceId);
    const nftIdentity = JSON.parse(nftIdentityJson || '{}');
    const tokenId = nftIdentity?.blockchainData?.tokenId;

    if (!tokenId) {
      throw new Error(`Device ${deviceId} is missing a tokenId for NFT minting`);
    }

    const nftStateKey = this._nftKey(tokenId);
    const existingNft = await ctx.stub.getState(nftStateKey);
    if (existingNft && existingNft.length > 0) {
      throw new Error(`NFT ${tokenId} has already been minted`);
    }

    const timestamp = new Date(ctx.stub.getTxTimestamp().seconds.low * 1000).toISOString();
    const txId = ctx.stub.getTxID();
    const resolvedOwner = ownerId || device.registeredBy || device.deviceId;

    const nftAsset = {
      assetType: 'deviceNFT',
      tokenId,
      nftToken: nftIdentity.nftToken,
      deviceId,
      ownerId: resolvedOwner,
      mintedAt: timestamp,
      mintTxId: txId,
      network: 'Hyperledger Fabric',
      status: 'minted',
      deviceFingerprint: nftIdentity.deviceFingerprint,
      digitalSignature: nftIdentity.digitalSignature,
      metadata: nftIdentity.metadata || {}
    };

    device.nftIdentity = {
      ...nftIdentity,
      blockchainData: {
        ...(nftIdentity.blockchainData || {}),
        network: 'Hyperledger Fabric',
        mintedAt: timestamp,
        mintTxId: txId,
        assetKey: nftStateKey,
        ownerId: resolvedOwner,
        assetType: 'deviceNFT'
      }
    };

    device.ledgerProof = {
      ...(device.ledgerProof || {}),
      nftMintTxId: txId,
      nftMintTimestamp: timestamp,
      lastOperation: 'mint-nft'
    };

    await ctx.stub.putState(nftStateKey, Buffer.from(JSON.stringify(nftAsset)));
    await ctx.stub.putState(deviceId, Buffer.from(JSON.stringify(device)));

    return JSON.stringify({
      device,
      nftAsset
    });
  }

  async getNFTAsset(ctx, tokenId) {
    const nftBytes = await ctx.stub.getState(this._nftKey(tokenId));
    if (!nftBytes || nftBytes.length === 0) {
      throw new Error(`NFT ${tokenId} does not exist`);
    }

    return nftBytes.toString();
  }

  async getDeviceNFTAsset(ctx, deviceId) {
    const device = await this._getParsedDevice(ctx, deviceId);
    const tokenId = device?.nftIdentity?.blockchainData?.tokenId;

    if (!tokenId) {
      throw new Error(`Device ${deviceId} does not have a minted NFT`);
    }

    return this.getNFTAsset(ctx, tokenId);
  }

  async activateDevice(ctx, deviceId) {
    const device = await this._getParsedDevice(ctx, deviceId);
    const timestamp = new Date(ctx.stub.getTxTimestamp().seconds.low * 1000).toISOString();

    device.status = 'active';
    device.lastModified = timestamp;
    device.ledgerProof = {
      ...(device.ledgerProof || {}),
      lastStatusTxId: ctx.stub.getTxID(),
      lastStatusBlockNumber: null,
      lastStatusTimestamp: timestamp,
      lastOperation: 'activate'
    };

    await ctx.stub.putState(deviceId, Buffer.from(JSON.stringify(device)));
    return JSON.stringify(device);
  }

  async verifyDevice(ctx, deviceId) {
    const device = await this._getParsedDevice(ctx, deviceId);

    return JSON.stringify({
      deviceId: device.deviceId,
      status: device.status,
      verified: device.status === 'active',
      hasNFTIdentity: Boolean(device.nftIdentity),
      lastOperation: device.ledgerProof?.lastOperation || null
    });
  }

  async deactivateDevice(ctx, deviceId) {
    const device = await this._getParsedDevice(ctx, deviceId);
    const timestamp = new Date(ctx.stub.getTxTimestamp().seconds.low * 1000).toISOString();

    device.status = 'inactive';
    device.lastModified = timestamp;
    device.ledgerProof = {
      ...(device.ledgerProof || {}),
      lastStatusTxId: ctx.stub.getTxID(),
      lastStatusBlockNumber: null,
      lastStatusTimestamp: timestamp,
      lastOperation: 'deactivate'
    };

    await ctx.stub.putState(deviceId, Buffer.from(JSON.stringify(device)));
    return JSON.stringify(device);
  }

  async revokeDevice(ctx, deviceId, revokedBy, reason) {
    revokedBy = revokedBy ?? '';
    reason = reason ?? '';

    const device = await this._getParsedDevice(ctx, deviceId);
    const timestamp = new Date(ctx.stub.getTxTimestamp().seconds.low * 1000).toISOString();

    device.status = 'inactive';
    device.lastModified = timestamp;
    device.revocation = {
      revokedAt: timestamp,
      revokedBy: revokedBy || 'system',
      reason: reason || 'revoked'
    };
    device.ledgerProof = {
      ...(device.ledgerProof || {}),
      lastStatusTxId: ctx.stub.getTxID(),
      lastStatusBlockNumber: null,
      lastStatusTimestamp: timestamp,
      lastOperation: 'revoke'
    };

    await ctx.stub.putState(deviceId, Buffer.from(JSON.stringify(device)));
    return JSON.stringify(device);
  }

  async getDeviceStatus(ctx, deviceId) {
    const device = await this._getParsedDevice(ctx, deviceId);

    return JSON.stringify({
      deviceId: device.deviceId,
      status: device.status,
      isActive: device.status === 'active',
      lastModified: device.lastModified || device.timestamp || null,
      ledgerProof: device.ledgerProof || null,
      revocation: device.revocation || null
    });
  }

  async getDeviceHistory(ctx, deviceId) {
    await this._getParsedDevice(ctx, deviceId);

    const iterator = await ctx.stub.getHistoryForKey(deviceId);
    const history = [];

    try {
      while (true) {
        const result = await iterator.next();
        if (result.done) {
          break;
        }

        const entry = result.value;
        const seconds = entry.timestamp?.seconds;
        const epochSeconds =
          typeof seconds === 'object' && seconds !== null && 'low' in seconds
            ? seconds.low
            : Number(seconds || 0);
        const txId = entry.txId;
        const timestamp = new Date(epochSeconds * 1000).toISOString();
        const isDelete = entry.isDelete;
        let value = null;

        if (!isDelete && entry.value && entry.value.length > 0) {
          const rawValue = Buffer.from(entry.value).toString('utf8');
          try {
            value = JSON.parse(rawValue);
          } catch (error) {
            value = rawValue;
          }
        }

        history.push({
          txId,
          timestamp,
          isDelete,
          operation: value?.ledgerProof?.lastOperation || (isDelete ? 'delete' : 'update'),
          value
        });
      }
    } finally {
      await iterator.close();
    }

    return JSON.stringify(history);
  }

  async removeDevice(ctx, deviceId) {
    await this._getParsedDevice(ctx, deviceId);
    await ctx.stub.deleteState(deviceId);
    return JSON.stringify({
      message: `Device ${deviceId} has been removed`,
      ledgerProof: {
        removalTxId: ctx.stub.getTxID()
      }
    });
  }

  async updateDevice(ctx, deviceId, type, manufacturer, publicKey, model) {
    model = model ?? '';
    const device = await this._getParsedDevice(ctx, deviceId);
    const timestamp = new Date(ctx.stub.getTxTimestamp().seconds.low * 1000).toISOString();

    device.type = type || device.type;
    device.manufacturer = manufacturer || device.manufacturer;
    device.publicKey = publicKey || device.publicKey;
    device.model = model || device.model;
    device.lastModified = timestamp;
    device.ledgerProof = {
      ...(device.ledgerProof || {}),
      lastUpdateTxId: ctx.stub.getTxID(),
      lastUpdateBlockNumber: null,
      lastUpdateTimestamp: timestamp,
      lastOperation: 'update'
    };

    await ctx.stub.putState(deviceId, Buffer.from(JSON.stringify(device)));
    return JSON.stringify(device);
  }

  async recordLedgerProof(ctx, deviceId, ledgerProofJson, nftIdentityJson) {
    ledgerProofJson = ledgerProofJson ?? '';
    nftIdentityJson = nftIdentityJson ?? '';
    const device = await this._getParsedDevice(ctx, deviceId);

    if (ledgerProofJson) {
      const ledgerProof = JSON.parse(ledgerProofJson);
      device.ledgerProof = {
        ...(device.ledgerProof || {}),
        ...ledgerProof
      };
    }

    if (nftIdentityJson) {
      device.nftIdentity = JSON.parse(nftIdentityJson);
    }

    await ctx.stub.putState(deviceId, Buffer.from(JSON.stringify(device)));
    return JSON.stringify(device);
  }

  async getDevicesByStatus(ctx, status) {
    const allResults = [];

    for await (const { key, value } of ctx.stub.getStateByRange('', '')) {
      if (key.startsWith('NFT:')) {
        continue;
      }

      const strValue = Buffer.from(value).toString('utf8');
      const record = JSON.parse(strValue);
      if (record.status === status) {
        allResults.push({ Key: key, Record: record });
      }
    }

    return JSON.stringify(allResults);
  }

  async getDevicesByType(ctx, type) {
    const allResults = [];

    for await (const { key, value } of ctx.stub.getStateByRange('', '')) {
      if (key.startsWith('NFT:')) {
        continue;
      }

      const strValue = Buffer.from(value).toString('utf8');
      const record = JSON.parse(strValue);
      if (record.type === type) {
        allResults.push({ Key: key, Record: record });
      }
    }

    return JSON.stringify(allResults);
  }

  async _getParsedDevice(ctx, deviceId) {
    const deviceBytes = await ctx.stub.getState(deviceId);
    if (!deviceBytes || deviceBytes.length === 0) {
      throw new Error(`Device ${deviceId} does not exist`);
    }

    return JSON.parse(deviceBytes.toString());
  }
}

module.exports = DeviceContract;
