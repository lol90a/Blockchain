import React, { useState } from 'react';
import axios from 'axios';
import { apiUrl } from './config/api';

function DataField({ label, value, long = false }) {
  return (
    <div className={`nft-data-field${long ? ' nft-data-field-long' : ''}`}>
      <span className="nft-data-label">{label}</span>
      <strong className={long ? 'nft-data-value nft-data-value-code' : 'nft-data-value'}>
        {value || 'Not recorded yet'}
      </strong>
    </div>
  );
}

export default function NFTDisplay({ deviceId, nftIdentity, showMissingMessage }) {
  const [verificationResult, setVerificationResult] = useState(null);
  const [verificationDetails, setVerificationDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  const verifyNFT = async () => {
    setLoading(true);
    try {
      const verifyUrl = apiUrl(`/devices/${deviceId}/nft/verify`);
      const response = await axios.get(verifyUrl);
      setVerificationResult(response.data.verificationResult);
      setVerificationDetails({
        deviceStatus: response.data.deviceStatus,
        ledgerProof: response.data.ledgerProof,
        nftAsset: response.data.nftAsset
      });
    } catch (error) {
      setVerificationResult({
        valid: false,
        reason: error.response?.data?.error || error.message || 'Verification failed'
      });
      setVerificationDetails(null);
    } finally {
      setLoading(false);
    }
  };

  if (showMissingMessage || !nftIdentity || Object.keys(nftIdentity).length === 0) {
    return (
      <div className="card" style={{ marginTop: 10 }}>
        <h3>NFT Identity</h3>
        <p style={{ color: '#b94a48' }}>No device identity available for this device.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: 10 }}>
      <h3>Fabric Device Identity</h3>
      <p>This record is stored on Hyperledger Fabric. The NFT transaction fields below come from the Fabric mint transaction for the device NFT asset.</p>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h4>Token</h4>
          <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}>
            {nftIdentity.nftToken}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '300px' }}>
          <h4>Device Fingerprint</h4>
          <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}>
            {nftIdentity.deviceFingerprint}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h4>Device Metadata</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          <div><strong>Type:</strong> {nftIdentity.metadata.deviceType}</div>
          <div><strong>Manufacturer:</strong> {nftIdentity.metadata.manufacturer}</div>
          <div><strong>Model:</strong> {nftIdentity.metadata.model || 'Not set'}</div>
          <div><strong>Serial Number:</strong> {nftIdentity.metadata.serialNumber}</div>
          <div><strong>Hardware ID:</strong> {nftIdentity.metadata.hardwareId}</div>
          <div><strong>MAC Address:</strong> {nftIdentity.metadata.macAddress}</div>
          <div><strong>Created:</strong> {new Date(nftIdentity.metadata.createdAt).toLocaleString()}</div>
          <div><strong>Signature Algorithm:</strong> {nftIdentity.metadata.publicKeyAlgorithm}</div>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h4>Digital Signature</h4>
        <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}>
          {nftIdentity.digitalSignature}
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h4>Identity Verification</h4>
        <button className="btn" onClick={verifyNFT} disabled={loading} style={{ marginBottom: '10px' }}>
          {loading ? 'Verifying...' : 'Verify Fabric Identity'}
        </button>

        {verificationResult && (
          <div className={`alert ${verificationResult.valid ? 'alert-success' : 'alert-error'}`}>
            <strong>{verificationResult.valid ? 'Valid' : 'Invalid'}:</strong> {verificationResult.reason}
          </div>
        )}

        {verificationDetails && (
          <div style={{ marginTop: '10px' }}>
            <div><strong>Device Status:</strong> {verificationDetails.deviceStatus}</div>
            {verificationDetails.ledgerProof?.nftMintTxId && <div><strong>NFT Mint Tx:</strong> {verificationDetails.ledgerProof.nftMintTxId}</div>}
            {verificationDetails.ledgerProof?.nftMintBlockNumber && <div><strong>NFT Mint Block:</strong> {verificationDetails.ledgerProof.nftMintBlockNumber}</div>}
            {verificationDetails.ledgerProof?.registrationTxId && <div><strong>Device Registration Tx:</strong> {verificationDetails.ledgerProof.registrationTxId}</div>}
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px' }}>
        <h4>Blockchain Data</h4>
        <div className="nft-data-grid">
          <DataField label="Asset Type" value={nftIdentity.blockchainData.assetType || 'deviceNFT'} />
          <DataField label="Owner" value={nftIdentity.blockchainData.ownerId} />
          <DataField label="Block Number" value={nftIdentity.blockchainData.blockNumber} />
          <DataField label="Network" value={nftIdentity.blockchainData.network || 'Hyperledger Fabric'} />
          <DataField label="Commit Status" value={nftIdentity.blockchainData.status || 'Unknown'} />
          <DataField label="Token ID" value={nftIdentity.blockchainData.tokenId} long />
          <DataField label="Asset Key" value={nftIdentity.blockchainData.assetKey} long />
          <DataField label="Transaction Hash" value={nftIdentity.blockchainData.transactionHash} long />
        </div>
      </div>

      {verificationDetails?.nftAsset && (
        <div style={{ marginTop: '20px' }}>
          <h4>Minted Fabric NFT Asset</h4>
          <div className="nft-asset-panel">
            <div className="nft-data-grid">
              <DataField label="Asset Type" value={verificationDetails.nftAsset.assetType} />
              <DataField label="Owner" value={verificationDetails.nftAsset.ownerId} />
              <DataField label="Minted At" value={verificationDetails.nftAsset.mintedAt} />
              <DataField label="Status" value={verificationDetails.nftAsset.status} />
              <DataField label="Token ID" value={verificationDetails.nftAsset.tokenId} long />
              <DataField label="Mint Tx" value={verificationDetails.nftAsset.mintTxId} long />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
