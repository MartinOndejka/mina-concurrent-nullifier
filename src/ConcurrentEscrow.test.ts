import {
  AccountUpdate,
  Bool,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  UInt64,
} from 'o1js';
import { ConcurrentEscrow } from './ConcurrentEscrow';

let proofsEnabled = false;

describe('ConcurrentEscrow', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    senderAccount: PublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: ConcurrentEscrow;

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  beforeAll(async () => {
    if (proofsEnabled) await ConcurrentEscrow.compile();

    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ privateKey: senderKey, publicKey: senderAccount } =
      Local.testAccounts[1]);
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new ConcurrentEscrow(zkAppAddress);

    await localDeploy();
  });

  it('deposit', async () => {
    const txn = await Mina.transaction(senderAccount, () => {
      zkApp.deposit(new UInt64(3_000));
    });

    await txn.prove();
    await txn.sign([senderKey]).send();

    expect(+Mina.getBalance(zkAppAddress)).toEqual(3_000);
  });

  it('withdraw 1', async () => {
    let txn = await Mina.transaction(senderAccount, () => {
      AccountUpdate.fundNewAccount(senderAccount);
      zkApp.withdraw(new UInt64(1_000));
    });

    await txn.prove();
    await txn.sign([senderKey]).send();

    expect(+Mina.getBalance(zkAppAddress)).toEqual(2_000);
  });

  it('withdraw 2 (should fail)', async () => {
    let txn = await Mina.transaction(senderAccount, () => {
      zkApp.withdraw(new UInt64(1_000));
    });

    await txn.prove();
    await txn.sign([senderKey]).send();
  });

  it('try to set state of token account (should fail)', async () => {
    let txn = await Mina.transaction(senderAccount, () => {
      const tokenAccountUpdate = AccountUpdate.createSigned(
        senderAccount,
        zkApp.token.id
      );

      tokenAccountUpdate.update.appState[0] = {
        isSome: Bool(true),
        value: Field(0),
      };
    });

    await txn.prove();
    await txn.sign([senderKey]).send();
  });
});
