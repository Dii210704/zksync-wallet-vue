import { Web3Provider } from 'ethers/providers';
import ethers, { Contract, utils } from 'ethers';
import { Provider, Wallet } from 'zksync';

import { IEthBalance } from './types/Common';
import { DEFAULT_ERROR } from './constants/errors';
import { Tokens, AccountState, TokenLike } from 'zksync/build/types';

export function getWalletNameFromProvider(): string | undefined {
  const provider = window['ethereum'];
  if (!provider) return;

  if (provider.isTorus) {
    return 'Torus';
  }
  if (provider.isMetaMask) {
    return 'Metamask';
  }
  if (provider.isDapper) {
    return 'Dapper';
  }
  if (provider.isWalletConnect) {
    return 'WalletConnect';
  }
  if (provider.isTrust) {
    return 'Trust';
  }
  if (provider.isCoinbaseWallet) {
    return 'Coinbase';
  }
  if (provider.isToshi) {
    return 'Toshi';
  }
  if (provider.isCipher) {
    return 'Cipher';
  }
  if (provider.isOpera) {
    return 'Opera';
  }
  if (provider.isStatus) {
    return 'Status';
  }
  if (provider.host && provider.host.indexOf('localhost') !== -1) {
    return 'localhost';
  }
}

export async function getConfirmationCount(
  provider: Web3Provider,
  txHash: string,
) {
  //todo: fixme - do not depend on transaction format, use type of transaction
  if (txHash.startsWith('sync-tx')) return 0;
  try {
    const trx = await provider.getTransaction(txHash);
    const currentBlock = await provider.getBlockNumber();

    if (typeof trx.blockNumber === 'undefined') return 0;
    return currentBlock - trx.blockNumber + 1;
    // return trx.confirmations;
  } catch (error) {
    return 0;
  }
}

export function getCookie(name: string) {
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (m) return m[2];
}

export function setCookie(name: string, value, exp?: Date) {
  let val = `${name}=${value}`;
  if (exp) {
    val += `; Expires=${exp.toUTCString()}`;
  }
  document.cookie = val;
}

export function whyDidYouUpdate() {
  const prevFields = {};
  return fields => {
    const eqCheck = {};
    for (const k in fields) {
      if (!(k in prevFields) || prevFields[k] !== fields[k]) {
        eqCheck[k] = false;
      } else {
        eqCheck[k] = true;
      }
      prevFields[k] = fields[k];
    }
    console.log(eqCheck);
  };
}

export const sortBalancesById = (a, b) => {
  if (a.id < b.id) {
    return -1;
  }
  if (a.id > b.id) {
    return 1;
  }
  return 0;
};

export const mintTestERC20Tokens = async (wallet: Wallet, token: TokenLike) => {
  const tokenAddress = wallet.provider.tokenSet.resolveTokenAddress(token);
  const ABI = [
    {
      constant: false,
      inputs: [
        {
          internalType: 'address',
          name: '_to',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: '_amount',
          type: 'uint256',
        },
      ],
      name: 'mint',
      outputs: [
        {
          internalType: 'bool',
          name: '',
          type: 'bool',
        },
      ],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ];
  const erc20Mintable = new Contract(tokenAddress, ABI, wallet.ethSigner);
  return await erc20Mintable.mint(wallet.address(), utils.parseEther('100'));
};

export async function loadTokens(
  syncProvider: Provider,
  syncWallet: Wallet,
  accountState: AccountState,
): Promise<{
  tokens: Tokens;
  zkBalances: IEthBalance[];
  ethBalances: IEthBalance[];
  error?: string;
}> {
  if (!syncProvider || !syncWallet) {
    return { tokens: {}, ethBalances: [], zkBalances: [], error: undefined };
  }
  const tokens = await syncProvider.getTokens();

  let error: string | undefined;
  const zkBalance = accountState.committed.balances;

  const balancePromises = Object.entries(tokens)
    .filter(t => t[1].symbol)
    .map(async ([key, value]) => {
      return {
        id: value.id,
        address: value.address,
        balance: +zkBalance[key] / Math.pow(10, 18),
        symbol: value.symbol,
      };
    });

  const ethBalances: IEthBalance[] = await Promise.all(balancePromises)
    .then(res => {
      const balance = res.filter(token => token);
      return balance as IEthBalance[];
    })
    .catch(err => {
      error =
        err.name && err.message ? `${err.name}: ${err.message}` : DEFAULT_ERROR;
      return [];
    });

  const zkBalancePromises = Object.keys(zkBalance).map(async key => ({
    address: tokens[key].address,
    balance: +zkBalance[key] / Math.pow(10, 18),
    symbol: tokens[key].symbol,
  }));

  const zkBalances: IEthBalance[] = await Promise.all(zkBalancePromises).catch(
    err => {
      error =
        err.name && err.message ? `${err.name}: ${err.message}` : DEFAULT_ERROR;
      return [];
    },
  );

  return {
    tokens,
    zkBalances,
    ethBalances,
    error,
  };
}

export function formatDate(d: Date) {
  const date = [
    d.getFullYear(),
    d
      .getMonth()
      .toString()
      .padStart(2, '0'),
    d
      .getDate()
      .toString()
      .padStart(2),
  ].join('-');
  const time =
    d
      .getHours()
      .toString()
      .padStart(2, '0') +
    ':' +
    d
      .getMinutes()
      .toString()
      .padStart(2, '0');
  return `${date} ${time} UTC`;
}
// export const formatDate = new Intl.DateTimeFormat('it-CH', {
//   day: '2-digit',
//   month: '2-digit',
//   year: 'numeric',
//   hour12: false,
//   hour: '2-digit',
//   minute: '2-digit',
// }).format;
