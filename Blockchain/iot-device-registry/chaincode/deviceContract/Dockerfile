FROM hyperledger/fabric-nodeenv:2.5
WORKDIR /usr/src/app
COPY . .
RUN npm install
CMD ["sh", "-c", "if [ -n \"$CHAINCODE_SERVER_ADDRESS\" ]; then npm run start:server-nontls; else npm start; fi"]
