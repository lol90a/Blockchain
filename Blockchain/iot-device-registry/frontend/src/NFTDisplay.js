import React, { useState } from 'react';
import axios from 'axios';
import { apiUrl } from './config/api';

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          <div><strong>Token ID:</strong> {nftIdentity.blockchainData.tokenId}</div>
          <div><strong>Asset Type:</strong> {nftIdentity.blockchainData.assetType || 'deviceNFT'}</div>
          <div><strong>Asset Key:</strong> {nftIdentity.blockchainData.assetKey || 'Not recorded yet'}</div>
          <div><strong>Owner:</strong> {nftIdentity.blockchainData.ownerId || 'Not recorded yet'}</div>
          <div><strong>Block Number:</strong> {nftIdentity.blockchainData.blockNumber || 'Not recorded yet'}</div>
          <div><strong>Transaction Hash:</strong> {nftIdentity.blockchainData.transactionHash || 'Not recorded yet'}</div>
          <div><strong>Network:</strong> {nftIdentity.blockchainData.network || 'Hyperledger Fabric'}</div>
          <div><strong>Commit Status:</strong> {nftIdentity.blockchainData.status || 'Unknown'}</div>
        </div>
      </div>

      {verificationDetails?.nftAsset && (
        <div style={{ marginTop: '20px' }}>
          <h4>Minted Fabric NFT Asset</h4>
          <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', fontSize: '12px', wordBreak: 'break-all' }}>
            <div><strong>Asset Type:</strong> {verificationDetails.nftAsset.assetType}</div>
            <div><strong>Token ID:</strong> {verificationDetails.nftAsset.tokenId}</div>
            <div><strong>Owner:</strong> {verificationDetails.nftAsset.ownerId}</div>
            <div><strong>Minted At:</strong> {verificationDetails.nftAsset.mintedAt}</div>
            <div><strong>Mint Tx:</strong> {verificationDetails.nftAsset.mintTxId}</div>
            <div><strong>Status:</strong> {verificationDetails.nftAsset.status}</div>
          </div>
        </div>
      )}
    </div>
  );
}
