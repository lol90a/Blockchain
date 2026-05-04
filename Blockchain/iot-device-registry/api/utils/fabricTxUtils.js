function createTransactionCommitWatcher(network, transactionId, timeoutMs = 30000) {
  let settled = false;
  let timer;
  let listener;
  const peers = network.getChannel().getEndorsers();

  const cleanup = () => {
    clearTimeout(timer);
    if (listener) {
      try {
        network.removeCommitListener(listener);
      } catch (error) {
        // Listener may already be removed.
      }
    }
  };

  const promise = new Promise(async (resolve, reject) => {
    listener = (error, event) => {
      if (settled) {
        return;
      }

      if (error) {
        settled = true;
        cleanup();
        reject(error);
        return;
      }

      if (!event) {
        return;
      }

      settled = true;
      cleanup();
      const blockEvent = event.getBlockEvent();
      resolve({
        blockNumber: blockEvent.blockNumber.toString(),
        transactionId,
        status: event.status,
        timestamp: event.timestamp ? event.timestamp.toISOString() : null
      });
    };

    timer = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(new Error(`Timed out waiting for commit of transaction ${transactionId}`));
    }, timeoutMs);

    try {
      await network.addCommitListener(listener, peers, transactionId);
    } catch (error) {
      settled = true;
      cleanup();
      reject(error);
    }
  });

  return {
    promise,
    cancel: () => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
    }
  };
}

async function submitTransactionWithDetails(contract, network, transactionName, args = [], timeoutMs = 30000) {
  const transaction = contract.createTransaction(transactionName);
  const transactionId = transaction.getTransactionId();
  const watcher = createTransactionCommitWatcher(network, transactionId, timeoutMs);

  try {
    const payload = await transaction.submit(...args);
    const commit = await watcher.promise;

    return {
      payload: payload.toString(),
      transactionId,
      blockNumber: commit.blockNumber,
      commitStatus: commit.status,
      timestamp: commit.timestamp
    };
  } catch (error) {
    watcher.cancel();
    throw error;
  }
}

module.exports = {
  submitTransactionWithDetails
};
