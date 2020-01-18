import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as sequence from 'sequence-sdk'
import * as bcrypt from 'bcrypt'
import * as mixpanel from 'mixpanel'

var twilio = require('twilio');


const accountSid = 'ACb9278b992adad9cad3076c8d1e1d18fd'
const authToken = '5fb7b68e00eaec9424b8bc34812f94e1'


var client = new twilio(accountSid, authToken);


export async function sendSms(to: any, body: any) {
    await client.messages.create({
        body: body, // 'Hello from Node',
        to: to, //'+17473335731',
        from: '+16137045948'
    })
        .then(() => console.log('Sent'))
        .catch(() => {
            console.log('Error')
        })
}

mixpanel.init("c34d5f963b5bd96ef4b081a908d456db")
export const rp = require('request-promise')
/* TO BE ADDED TO tsconfig.json FOR sequence-sdk */
/* {
    "compilerOptions": {
      "lib": ["es2015", "es2016", "esnext"],
      "types": ["node"]
    }
  } */
/* COMMENT THIS BLOCK BEFORE DEPLOYING AND UNCOMMENT THE NEXT BLOC */
const serviceAccount = require('../duniapay-dc166-a0c6f65c3db5.json')
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://duniapay-dc166.firebaseio.com/'

})

const DUNIAPAY_WEB_API_KEY = 'AIzaSyA4BFpuFLJ0hkqqnhsRbyDqsZ6piDV05ws'
export const PASSWORD_RESET_ENDPOINT = `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${DUNIAPAY_WEB_API_KEY}`
export const ID_TOKEN_ENDPOINT = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${DUNIAPAY_WEB_API_KEY}`
export const EMAIL_VERIFICATION_ENDPOINT = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${DUNIAPAY_WEB_API_KEY}`
export const EMAIL_CONFIRMATION_ENDPOINT = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${DUNIAPAY_WEB_API_KEY}`

/* UNCOMMENT THIS BLOC BEFORE DEPLOYING*/
//admin.initializeApp();

/* SEGMENT STUFF */





const SEGMENT_API_KEY = 't2YJB4VigFQzc65jpPJmxDv0DWRx9QDr'
const Analytics = require('analytics-node')
export const analytics = new Analytics(SEGMENT_API_KEY, { flushAt: 1 }) //Remove flushAt for prod

export const Errors = {
    internal: {
        code: 0,
        message: 'internal'
    },
    handleNotFound: {
        code: 1,
        message: "Handle not found"
    },
    incorrectPassword: {
        code: 2,
        message: "Incorrect password"
    },
    receiverNotFound: {
        code: 3,
        message: 'Receiver not found'
    },
    duplicatePhoneNumber: {
        code: 4,
        message: 'Duplicate phone number'
    },
    insufficiantFunds: {
        code: 5,
        message: 'Insufficiant funds'
    },
    invalidPassPhrase: {
        code: 6,
        message: 'Invalid pass phrase'
    },
    transactionNotOnHold: {
        code: 7,
        message: 'Cannot cancel transaction not on hold'
    },
    negativeAmount: {
        code: 8,
        message: 'Amount cannot be negative'
    },
    duplicateHandle: {
        code: 9,
        message: 'Duplicate handle'
    },
    failedToResetPassword: {
        code: 10,
        message: 'Failed to reset password'
    }
}

/* FIRESTORE DATABASE */
export const db = admin.firestore()

/* USER FIELDS IN FIRESTORE */
export type UserRecord = {
    uid: string //Not a field in firestore
    handle: string
    firstName: string
    lastName: string
    birthday: string
    gender: string
    city: string
    status: string
    country: string
    phoneNumber: string
    email: string
    password: string
    wallet: {
        fcfa: number
        points: number
    }
    stats: {
        totalSent: number
        totalReceived: number
        totalSaved: number
    }
    referrer: {
        handle: string
        nonce: string
    }
    notificationToken: string
}

/* TRANSACTION FIELDS IN FIRESTORE */
export type TransactionRecord = {
    type: TransactionType.TRANSFER | TransactionType.INVITATION | TransactionType.CASHIN | TransactionType.CASHOUT | TransactionType.AIRTIME | TransactionType.BILL
    sender: {
        uid: string
        handle: string
        firstName: string
        lastName: string
    }
    receiver: {
        uid: string
        handle: string
        firstName: string
        lastName: string
    }
    amount: number
    passPhrase: string
    status: TransactionStatus.ONHOLD | TransactionStatus.ACCEPTED | TransactionStatus.DECLINED | TransactionStatus.CANCELLED
    ledgerRecords: { first: any, second: any }
    intouchResponses: { first: any, second: any }
    clientTimestamp: string
    nonce?: string
}

export enum TransactionStatus {
    ONHOLD = 'ONHOLD',
    ACCEPTED = 'ACCEPTED',
    DECLINED = 'DECLINED',
    CANCELLED = 'CANCELLED'
}

/* SEQUENCE LEDGER */
const SEQUENCE_API_KEY = 'QZ4ERVFMRQ6SQOLMSHYNRFZ6RRKRT2JR'
export const ledger = new sequence.Client({
    ledgerName: 'jalil-dev',
    credential: SEQUENCE_API_KEY
})

/* SEQUENCE LEDGER STUFF */
type Key = 'root' //Keys currently available
export type SequenceAccount = {
    id: string
    keyIds: Key[]
    tags: { type: 'consumer' | 'merchant' }
}

export type ledgerPayload = {
    fxRate?: number
    soldPrice?: number
    txtId: string
    address?: string
    provider?: string
    realRate?: number
    amountToBuy?: number
    sourceAccountId: string
}

type TokenTags = {
    status: TokenStatus.AVAILABLE | TokenStatus.ONHOLD,
    heldFor?: string
}
enum TokenStatus {
    AVAILABLE = 'AVAILABLE', //Tokens which make up the current balance of the user
    ONHOLD = 'ONHOLD' //Tokens held for a transfer, not usable in this state
}

export enum TransactionType {
    INVITATION = 'invitation',
    TRANSFER = 'p2p-transfer',
    PAYMENT = 'merchant_payment',
    CASHIN = 'cash-in',
    CASHOUT = 'cash-out',
    AIRTIME = 'airtime',
    BILL = 'bill',
    RESERVATION = 'reservation',
    CANCELLATION = 'cancellation',
    FEE = 'company_fee',
    COMMISSION = 'commision'
}



export enum PaymentMode {
    CASH = 'cash',
    MOBILEMONEY = 'mobile-money',
    WIRE = 'WIRE'
}

//Actions
type Issue = {
    flavorId: 'fcfa',
    amount: number,
    destinationAccountId: string,
    //actionTags: {type: TransactionType.CASHIN , mode: PaymentMode.CASH , transaction_id : ' ' },
    tokenTags: { status: TokenStatus.AVAILABLE }
}
type Transfer = {
    flavorId: 'fcfa',
    amount: number,
    filter: string,
    filterParams: string[],
    sourceAccountId: string,
    destinationAccountId: string,
    // actionTags: {type: TransactionType.TRANSFER},
    tokenTags: TokenTags
}

type Retire = {
    flavorId: 'fcfa',
    amount: number,
    filter: string,
    filterParams: string[],
    sourceAccountId: string,

    // actionTags: {type: ActionTag.CASHOUT | ActionTag.FEE},
}



/* INTOUCH STUFF */
export const INTOUCH_SERVICE = {
    ORANGE: {
        CASHIN: 'BF_PAIEMENTMARCHAND_OM',
        CASHOUT: 'BF_CASHIN_OM',
        AIRTIME: 'BF_AIRTIME_ORANGE',
        BILL: ''
    },
    TELMOB: {
        CASHIN: 'BF_PAIEMENTMARCHAND_MOBICASH',
        CASHOUT: 'BF_CASHIN_MOBICASH',
        AIRTIME: 'BF_AIRTIME_TELMOB',
        BILL: ''
    },
    TELECEL: {
        CASHIN: '',
        CASHOUT: '',
        AIRTIME: 'BF_AIRTIME_TELECEL',
        BILL: ''
    },
    CORIS: {
        CASHIN: 'BF_PAIEMENTMARCHAND_CORIS',
        CASHOUT: 'BF_CASHIN_CORIS',
        AIRTIME: '',
        BILL: ''
    },
    YUP: {
        CASHIN: 'BF_PAIEMENTMARCHAND_YUP',
        CASHOUT: 'BF_CASHIN_YUP',
        AIRTIME: '',
        BILL: ''
    }
    // SONABEL: {
    //     CASHIN: '',
    //     CASHOUT: '',
    //     AIRTIME: '',
    //     BILL: 'XXXXXXXXX'
    // },
    // ONEA: {
    //     CASHIN: '',
    //     CASHOUT: '',
    //     AIRTIME: '',
    //     BILL: 'XXXXXXXXX'
    // }
}
export enum IntouchProvider {
    ORANGE = 'ORANGE',
    TELMOB = 'TELMOB',
    TELECEL = 'TELECEL',
    CORIS = 'CORIS',
    YUP = 'YUP'
    // SONABEL = 'SONABEL',
    // ONEA = 'ONEA'
}
export enum IntouchOperation {
    CASHIN = 'CASHIN',
    CASHOUT = 'CASHOUT',
    AIRTIME = 'AIRTIME',
    BILL = 'BILL',
}
export enum IntouchTransactionStatus {
    FAILED = 'FAILED',
    PENDING = 'PENDING', //For cashin
    SUCCESSFUL = 'SUCCESSFUL',
    INITIATED = 'INITIATED' //For paiment marchand
}
enum IntouchEndPoint {
    //'Paiement marchand' in Intouch doc. For buying tokens
    CASHIN = 'https://api.gutouch.com/dist/api/touchpayapi/v1/DUNYA0827/transaction?loginAgent=11223345&passwordAgent=0000',
    CASHIN_CORIS = 'https://api.gutouch.com/dist/api/touchpayapi/v1/DUNYA0827/coris/tpstatus?loginAgent=11223345&passwordAgent=0000',
    CASHIN_YUP = 'https://api.gutouch.com/dist/api/touchpayapi/v1/DUNYA0827/yup/tpgetcode?loginAgent=11223345&passwordAgent=0000',
    //'CASHIN' in Intouch doc. For refunding clients.
    CASHOUT = 'https://api.gutouch.com/v1/DUNYA0827/cashin',
    AIRTIME = 'https://api.gutouch.com/v1/DUNYA0827/airtime',
    BILL = '',
    OTP_CORIS = 'https://api.gutouch.com/dist/api/touchpayapi/v1/DUNYA0827/coris/tpgetcode?loginAgent=11223345&passwordAgent=0000',
    OTP_YUP = 'https://api.gutouch.com/dist/api/touchpayapi/v1/DUNYA0827/yup/tpgetcode?loginAgent=11223345&passwordAgent=0000'
}
enum IntouchCredential {
    PARTNER_ID = 'DUNYA0827',
    LOGIN_API = '11223345',     //partner phone number
    PASSWORD_API = '0000',  //password
    CALLBACK_URL = 'https://us-central1-duniapay-dc166.cloudfunctions.net/intouchCallback'
}

/**
 * 
 * @param options 
 */
export async function findUser(options?: { uid?: string, handle?: string, email?: string, phoneNumber?: string }) {
    if (options === undefined) return
    let user

    if (options.uid !== undefined && options.uid.length > 0) {
        let snapshot
        try {
            snapshot = await db.collection('users-beta').doc(options.uid).get()
        } catch (error) {
            console.log(error)
            return
        }

        if (snapshot.exists) {
            user = snapshot.data()

            //Should always be true because snapshot.exists is true here
            if (user !== undefined) { user.uid = snapshot.id; user = user as UserRecord }
        }

    } else if (options.handle !== undefined && options.handle.length > 0) {
        let snapshot
        try {
            snapshot = await db.collection('users-beta').where('handle', '==', options.handle).get()
        } catch (error) {
            console.log(error)
            return
        }

        if (!snapshot.empty) {
            user = snapshot.docs[0].data()
            user.uid = snapshot.docs[0].id
            user = user as UserRecord
        }

    } else if (options.email !== undefined && options.email.length > 0) {
        let snapshot
        try {
            snapshot = await db.collection('users-beta').where('email', '==', options.email).get()
        } catch (error) {
            console.log(error)
            return user
        }

        if (!snapshot.empty) {
            user = snapshot.docs[0].data()
            user.uid = snapshot.docs[0].id
            user = user as UserRecord
        }
    } else if (options.phoneNumber !== undefined && options.phoneNumber.length > 0) {
        let snapshot
        try {
            snapshot = await db.collection('users-beta').where('phoneNumber', '==', options.phoneNumber).get()
        } catch (error) {
            console.log(error)
            return user
        }

        if (!snapshot.empty) {
            user = snapshot.docs[0].data()
            user.uid = snapshot.docs[0].id
            user = user as UserRecord
        }
    }
    return user
}




/**
 * 
 * @param id 
 * @param options 
 */
export async function findTransaction(id: string, options?: { senderUid?: string, receiverUid?: string, }) {
    if (id.length <= 0) return
    let transaction

    if (options !== undefined) {
        const uid = (options.senderUid !== undefined) ? options.senderUid :
            (options.receiverUid !== undefined) ? options.receiverUid : ''

        if (uid.length <= 0) return

        let snapshot
        try {
            snapshot = await db.collection('users-beta').doc(uid).collection('transactions').doc(id).get()
        } catch (error) {
            console.log(error)
            return
        }

        if (snapshot.exists) {
            transaction = snapshot.data()
            //Should always be true because snapshot.exists is true here
            if (transaction !== undefined) transaction = transaction as TransactionRecord
        }
    } else {
        /* QUERY OVER ALL TRANSACTIONS SUB-COLLECTIONS. WOULD NOT WANT THAT */
    }
    return transaction
}




/**
 * 
 * @param transactionType 
 * @param amount 
 * @param sourceAccountId 
 * @param destinationAccountId se TransactionType.CASHOUT / AIRTIME for cashout or airtime reservation
 */
export async function writeTransactionToLedger(transactionType: TransactionType, amount: number,
    id: { sourceAccountId?: string, destinationAccountId?: string }) {
    if (amount <= 0) return

    if (transactionType === TransactionType.RESERVATION) {
        /* MAKE SURE THE SOURCE AND DESTINATION IDs HAVE BEEN PROVIDED */
        if (id.sourceAccountId !== undefined && id.destinationAccountId !== undefined) {
            const hold: Transfer = {
                flavorId: 'fcfa',
                amount: amount,
                filter: 'tags.status=$1',
                filterParams: [TokenStatus.AVAILABLE],
                sourceAccountId: id.sourceAccountId,
                destinationAccountId: id.sourceAccountId,
                // actionTags: {type: ActionTag.ONHOLD},
                tokenTags: { status: TokenStatus.ONHOLD, heldFor: id.destinationAccountId }
            }
            return ledger.transactions.transact(builder => {
                builder.transfer(hold)
                builder.transactionTags = {
                    type: transactionType
                }
            })
        }
    } else if (transactionType === TransactionType.TRANSFER) {
        /* MAKE SURE THE SOURCE AND DESTINATION IDs HAVE BEEN PROVIDED */
        if (id.sourceAccountId !== undefined && id.destinationAccountId !== undefined) {
            const transfer: Transfer = {
                flavorId: 'fcfa',
                amount: amount,
                filter: 'tags.status=$1 AND tags.heldFor=$2',
                filterParams: [TokenStatus.ONHOLD, id.destinationAccountId],
                sourceAccountId: id.sourceAccountId,
                destinationAccountId: id.destinationAccountId,
                tokenTags: { status: TokenStatus.AVAILABLE },
            }
            return ledger.transactions.transact(builder => {
                builder.transfer(transfer)
                builder.transactionTags = {
                    type: transactionType
                }
            })
        }
    } else if (transactionType === TransactionType.PAYMENT) {
        /* MAKE SURE THE SOURCE AND DESTINATION IDs HAVE BEEN PROVIDED */
        if (id.sourceAccountId !== undefined && id.destinationAccountId !== undefined) {
            const transfer: Transfer = {
                flavorId: 'fcfa',
                amount: amount,
                filter: 'tags.status=$1',
                filterParams: [TokenStatus.AVAILABLE],
                sourceAccountId: id.sourceAccountId,
                destinationAccountId: id.destinationAccountId,
                tokenTags: { status: TokenStatus.AVAILABLE }
            }
            return ledger.transactions.transact(builder => {
                builder.transfer(transfer)

                /* MAYBE CHARGE MERCHANT A FEE */

                builder.transactionTags = {
                    type: transactionType
                }
            })
        }
    } else if (transactionType === TransactionType.CASHIN) {
        /* MAKE SURE THE DESTINATION ID HAS BEEN PROVIDED */
        if (id.destinationAccountId !== undefined) {
            const issue: Issue = {
                flavorId: 'fcfa',
                amount: amount,
                destinationAccountId: id.destinationAccountId,
                tokenTags: { status: TokenStatus.AVAILABLE }
            }
            return ledger.transactions.transact(builder => {
                builder.issue(issue)
                builder.transactionTags = {
                    type: transactionType
                }
            })
        }
    } else if (transactionType === TransactionType.CASHOUT) {
        /* MAKE SURE THE SOURCE ID HAS BEEN PROVIDED */
        if (id.sourceAccountId !== undefined) {
            const retire: Retire = {
                flavorId: 'fcfa',
                amount: amount,
                filter: 'tags.status=$1 AND tags.heldFor=$2',
                filterParams: [TokenStatus.ONHOLD, IntouchOperation.CASHOUT],
                sourceAccountId: id.sourceAccountId,
                // actionTags: {type: ActionTag.CASHOUT}
            }
            return ledger.transactions.transact(builder => {
                builder.retire(retire)
                builder.transactionTags = {
                    type: transactionType
                }
            })
        }
    } else if (transactionType === TransactionType.AIRTIME) {
        /* MAKE SURE THE SOURCE ID HAS BEEN PROVIDED */
        if (id.sourceAccountId !== undefined) {
            const retire: Retire = {
                flavorId: 'fcfa',
                amount: amount,
                filter: 'tags.status=$1 AND tags.heldFor=$2',
                filterParams: [TokenStatus.ONHOLD, IntouchOperation.AIRTIME],
                sourceAccountId: id.sourceAccountId,
                // actionTags: {type: ActionTag.CASHOUT}
            }
            return ledger.transactions.transact(builder => {
                builder.retire(retire)
                builder.transactionTags = {
                    type: transactionType
                }
            })
        }
    } else if (transactionType === TransactionType.CANCELLATION) {
        /* MAKE SURE THE SOURCE AND DESTINATION IDs HAVE BEEN PROVIDED */
        if (id.sourceAccountId !== undefined && id.destinationAccountId !== undefined) {
            const cancel: Transfer = {
                flavorId: 'fcfa',
                amount: amount,
                filter: 'tags.status=$1 AND tags.heldFor=$2',
                filterParams: [TokenStatus.ONHOLD, id.destinationAccountId],
                sourceAccountId: id.sourceAccountId,
                destinationAccountId: id.sourceAccountId,
                // actionTags: {type: ActionTag.CANCELLATION},
                tokenTags: { status: TokenStatus.AVAILABLE }
            }
            return ledger.transactions.transact(builder => {
                builder.transfer(cancel)
                builder.transactionTags = {
                    type: transactionType
                }
            })
        }
    }
}
export function logTransactionErrorAndThrow(error: any) {
    const actionError = error.data.actions[0]
    console.log(actionError.message)
    console.log(actionError.seqCode)
    //index of action that failed
    console.log(actionError.data.index)
    throw new functions.https.HttpsError('unknown', 'Transaction failed')
}

/**
 * 
 * @param senderUid The user id of the sender
 * @param amount The amount of the transfer
 * @param receiver Some identfiers about the sender
 *                 {
 *                   uid?: 'string',
 *                   phoneNumber?: 'string',
 *                   email?: 'string'
 *                 }
 * 
 * @returns senderInfo: The sender's info stored in the database,
 *          receiverInfo: The receiver's info stored in the database
 * 
 */
export async function validateTransfer(senderUid: string, amount: number, receiver: { uid?: string, handle?: string, email?: string, phoneNumber?: string }) {
    if (senderUid.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'uid must be a non empty string')
    }

    /* SENDER'S AND RECEIVER'S INFOs */
    const senderInfo = await findUser({ uid: senderUid })
    const receiverInfo = await findUser({ uid: receiver.uid, handle: receiver.handle, email: receiver.email, phoneNumber: receiver.phoneNumber })

    /* LET CLIENT KNOW IF WE COULDN'T FIND THE SENDER OR THE RECEIVER */
    if (senderInfo === undefined) {
        throw new functions.https.HttpsError('not-found', 'Can\'t find sender\'s info')
    }
    if (receiverInfo === undefined) {
        throw new functions.https.HttpsError('not-found', `${Errors.receiverNotFound.code}-${Errors.receiverNotFound.message}`)
    }

    /* IF SENDER DOES NOT HAVE ENOUGH FUNDS, REJECT */
    if (senderInfo.wallet.fcfa < amount) {
        throw new functions.https.HttpsError('failed-precondition', `${Errors.insufficiantFunds.code}-${Errors.insufficiantFunds.message}`)
    }

    return { senderInfo, receiverInfo }
}

/**
 * Credits referrer balance and returns welcome bonus for new user
 * 
 * @param handle Referrer's handle
 * 
 * @returns The welcome bonus
 */
export async function referralLogic(handle: string) {
    await creditReferrerPointsBalance(handle)
    return 0
}

/**
 * 
 * @param string The string to hash
 * @returns A promise resulting in the hash
 */
export function getHash(string: string) {
    const saltRounds = 10;
    return bcrypt.hash(string, saltRounds)
}

/**
 * 
 * @param string The string that has been hashed
 * @param hash The hash
 * 
 * @returns A promise resulting in true if match or false otherwise
 */
export function compareToHash(string: string, hash: string) {
    return bcrypt.compare(string, hash);
}

export function sendOtpToClient(amount: number, phoneNumber: string, provider: IntouchProvider) {
    if (amount <= 0) return

    const options = {
        method: 'PUT',
        auth: {
            'user': 'A890E336335C2A7168E0C6CDF93D284B2407E6B85BC86FD10D801CEADFEF3FA1',
            'pass': '68D23C9C338CCF97EE6835FAEC23CBC3F979355456B72221B15806ADFFD08055',
            'sendImmediately': false
        },
        uri: '',
        body: {
            amount: amount,
            type: 'debit',
            recipientNumber: trimCountryCode(phoneNumber),
            currency: '952',
            compte: 'merchant'
        },
        json: true
    }

    switch (provider) {
        case IntouchProvider.CORIS: {
            options.uri = IntouchEndPoint.OTP_CORIS
            break
        }
        case IntouchProvider.YUP: {
            options.uri = IntouchEndPoint.OTP_YUP
            break
        }
        default: return
    }

    return rp(options)
}

export function getFees(amount: number, provider?: string) {
    if (provider == undefined) {
        provider == 'DuniaPay'
    }
    if (amount <= 0) return


    if (amount != undefined) {
        if (provider == 'Vers DuniaPay') {
            if (amount < 50000) {
                return 50;
            } else if ((amount >= 50005) && (amount < 100000)) {
                return 75;
            } else if (amount >= 100005 && amount < 250000) {
                return 125;
            } else if (amount >= 250005 && amount < 1000000) {
                return Math.round(amount * 0.02);
            } else if (amount >= 1000000) {
                return Math.round(amount * 0.02);
            }
        } else if (provider != 'Vers DuniaPay') {
            return Math.round(amount * 0.02);
        }
    }
    return 0
}

/**
 * 
 * @param amount
 * @param phoneNumber
 * @param transactionId
 * @param provider
 * @param operation
 */
export function initiateIntouchTransaction(amount: number, phoneNumber: string, transactionId: string,
    provider: IntouchProvider, operation: IntouchOperation, otp: string) {
    if (amount <= 0) return

    const options: any = {
        method: 'PUT',
        auth: {
            'user': 'A890E336335C2A7168E0C6CDF93D284B2407E6B85BC86FD10D801CEADFEF3FA1',
            'pass': '68D23C9C338CCF97EE6835FAEC23CBC3F979355456B72221B15806ADFFD08055',
            'sendImmediately': false
        },
        uri: '',
        body: {},
        json: true
    }

    switch (operation) {
        case IntouchOperation.CASHIN: {
            options.uri = IntouchEndPoint.CASHIN
            options.body = {
                idFromClient: transactionId,
                amount: amount,
                callback: IntouchCredential.CALLBACK_URL,
                recipientNumber: trimCountryCode(phoneNumber),
                serviceCode: INTOUCH_SERVICE[provider][operation],
                additionnalInfos: {
                    recipientEmail: '',
                    recipientFirstName: '',
                    recipientLastName: '',
                }
            }

            if (provider == IntouchProvider.CORIS || provider == IntouchProvider.YUP) {
                options.uri = provider == IntouchProvider.CORIS ? IntouchEndPoint.CASHIN_CORIS : IntouchEndPoint.CASHIN_YUP
                options.body.additionnalInfos = {
                    ...options.body.additionnalInfos,
                    currency: '952',
                    trxcode: otp
                }
            } else if (provider == IntouchProvider.ORANGE) {
                options.uri = IntouchEndPoint.CASHIN
                options.body.additionnalInfos = {
                    ...options.body.additionnalInfos,
                    destinataire: trimCountryCode(phoneNumber),
                    otp: otp
                }
            } else if (provider == IntouchProvider.TELMOB) {
                options.uri = IntouchEndPoint.CASHIN
                options.body.additionnalInfos = {
                    ...options.body.additionnalInfos,
                    destinataire: trimCountryCode(phoneNumber),
                }
            }
            break
        }
        case IntouchOperation.AIRTIME: {
            options.uri = IntouchEndPoint.AIRTIME
            options.body = {
                login_api: IntouchCredential.LOGIN_API,
                password_api: IntouchCredential.PASSWORD_API,
                call_back_url: IntouchCredential.CALLBACK_URL,
                partner_id: IntouchCredential.PARTNER_ID,
                amount: amount,
                partner_transaction_id: transactionId,
                service_id: INTOUCH_SERVICE[provider][operation],
                recipient_phone_number: trimCountryCode(phoneNumber)
            }
            break
        }
        case IntouchOperation.CASHOUT: {
            options.uri = IntouchEndPoint.CASHOUT
            options.body = {
                login_api: IntouchCredential.LOGIN_API,
                password_api: IntouchCredential.PASSWORD_API,
                call_back_url: IntouchCredential.CALLBACK_URL,
                partner_id: IntouchCredential.PARTNER_ID,
                amount: amount,
                partner_transaction_id: transactionId,
                service_id: INTOUCH_SERVICE[provider][operation],
                recipient_phone_number: trimCountryCode(phoneNumber)
            }
            break
        }
        default: return
    }

    return rp(options)
}

/**
 * 
 * @param token 
 * @param title 
 * @param body 
 * @param payload 
 */
export function notify(token: string, title: string, body: string, payload?: { [key: string]: string }) {
    const notification = {
        token: token,
        notification: {
            title: title,
            body: body
        },
        data: payload
    }
    return admin.messaging().send(notification)
}


async function creditReferrerPointsBalance(handle: string) {
    //const REFERRAL_POINTS = 50
    const referrer = await findUser({ handle: handle })
    let newbBalance = 0
    if (referrer === undefined) {
        return 0
    } else {
        newbBalance = referrer.wallet.fcfa + 500
        await db.collection('users-beta').doc(referrer.uid).update({ wallet: { fcfa: newbBalance, } })
        //await writeTransactionToLedger(TransactionType.CASHIN, 500, { destinationAccountId: referrer.uid }, ),
        notify(referrer.notificationToken, 'Félicitation', 'Vous avez gagnez 500 Fcfa en partageant DuniaPay').then((onVal) => {
            console.log('Notify sent')
            return newbBalance
        }).catch((errr) => {
            return errr
        })
    }
    return newbBalance
}

export function getSavings(amount: number) {
    const competitionRate = 9 / 100
    const ourRate = 2 / 100
    return amount * (competitionRate - ourRate)
}





export async function purchaseBtc(
    data: {
        senderUid: string
        amount: number,
        purchase: {
            handle?: string,
            soldPrice?: number,
            realRate?: number,
            fxRate?: number
        },
        receiver: { uid?: string, handle?: string, email?: string, phoneNumber?: string }
        address: string,
        clientTimestamp: string
    }) {
    const { amount, receiver, clientTimestamp } = data

    if ((typeof amount !== 'number') || amount <= 0) throw new functions.https.HttpsError('invalid-argument',
        `${Errors.negativeAmount.code}-${Errors.negativeAmount.message}`
    )

    /* MAKE SURE TRANSFER IS FEASIBLE */
    const { senderInfo, receiverInfo } = await validateTransfer(data.senderUid, amount, receiver) //Returns sender's and receiver's info


    /* PUT SENDER'S TOKENS ON HOLD */
    let transaction
    try {
        transaction = await writeTransactionToLedger(TransactionType.RESERVATION, amount,
            { sourceAccountId: senderInfo.uid, destinationAccountId: receiverInfo.uid });
    } catch (error) {
        console.log(error)
        throw new functions.https.HttpsError('internal', 'Could not put tokens on hold for transfer')
    }

    /* UPDATE SENDER'S BALANCE AND ADD TRANSACTION IN BOTH ACCOUNTS */
    const writeBatch = db.batch()
    const senderRef = db.collection('users-beta').doc(senderInfo.uid)
    const receiverRef = db.collection('users-beta').doc(receiverInfo.uid)
    const senderTransacRef = senderRef.collection('transactions').doc(transaction.id)   //The transaction ID in the database will be
    //the ID of the first ledger record pertaining
    //to this transfer
    const receiverTransacRef = receiverRef.collection('transactions').doc(transaction.id)
    const senderNewFcfaBalance = senderInfo.wallet.fcfa - amount

    const transactionRecord: TransactionRecord = {
        type: TransactionType.TRANSFER,
        sender: {
            uid: senderInfo.uid,
            handle: senderInfo.handle,
            firstName: senderInfo.firstName,
            lastName: senderInfo.lastName
        },
        receiver: {
            uid: receiverInfo.uid,
            handle: receiverInfo.handle,
            firstName: receiverInfo.firstName,
            lastName: receiverInfo.lastName
        },
        amount: amount,
        passPhrase: 'none',
        status: TransactionStatus.ONHOLD,
        ledgerRecords: { first: transaction, second: {} },
        intouchResponses: { first: {}, second: {} },
        clientTimestamp: clientTimestamp,
    }

    writeBatch
        .update(senderRef, { wallet: { fcfa: senderNewFcfaBalance, points: senderInfo.wallet.points } })
        .set(senderTransacRef, transactionRecord)
        .set(receiverTransacRef, transactionRecord)

    //Write changes to firestore
    try {
        await writeBatch.commit()
    } catch (error) {
        console.log(error)

        /* ROLL BACK CHANGES TO LEDGER */

        throw new functions.https.HttpsError('internal', 'Transaction failed. Changes rolled back')
    }

    /* SEND NOTIFICATION TO RECEIVER */
    try {
        await notify(receiverInfo.notificationToken, `${senderInfo.firstName} ${senderInfo.lastName} vous a envoye ${amount}`, '')
    } catch (error) {
        console.log(error)
    }
}

/**
 * 
 * FOR BETA
 * 
 */
export async function sendTokens(
    data: {
        senderUid: string
        amount: number,
        receiver: {
            uid?: string,
            handle?: string,
            email?: string,
            phoneNumber?: string
        },
        passPhrase: string
    }) {
    const { amount, receiver, passPhrase } = data

    if ((typeof amount !== 'number') || amount <= 0) throw new functions.https.HttpsError('invalid-argument',
        `${Errors.negativeAmount.code}-${Errors.negativeAmount.message}`
    )

    /* MAKE SURE TRANSFER IS FEASIBLE */
    const { senderInfo, receiverInfo } = await validateTransfer(data.senderUid, amount, receiver) //Returns sender's and receiver's info



    /* PUT SENDER'S TOKENS ON HOLD */
    let transaction
    try {
        transaction = await writeTransactionToLedger(TransactionType.RESERVATION, amount,
            { sourceAccountId: senderInfo.uid, destinationAccountId: receiverInfo.uid });
    } catch (error) {
        console.log(error)
        throw new functions.https.HttpsError('internal', 'Could not put tokens on hold for transfer')
    }

    /* UPDATE SENDER'S BALANCE AND ADD TRANSACTION IN BOTH ACCOUNTS */
    const writeBatch = db.batch()
    const senderRef = db.collection('users-beta').doc(senderInfo.uid)
    const receiverRef = db.collection('users-beta').doc(receiverInfo.uid)
    const senderTransacRef = senderRef.collection('transactions').doc(transaction.id)   //The transaction ID in the database will be
    //the ID of the first ledger record pertaining
    //to this transfer
    const receiverTransacRef = receiverRef.collection('transactions').doc(transaction.id)
    const senderNewFcfaBalance = senderInfo.wallet.fcfa - amount

    const transactionRecord: TransactionRecord = {
        type: TransactionType.TRANSFER,
        sender: {
            uid: senderInfo.uid,
            handle: senderInfo.handle,
            firstName: senderInfo.firstName,
            lastName: senderInfo.lastName
        },
        receiver: {
            uid: receiverInfo.uid,
            handle: receiverInfo.handle,
            firstName: receiverInfo.firstName,
            lastName: receiverInfo.lastName
        },
        amount: amount,
        passPhrase: passPhrase,
        status: TransactionStatus.ONHOLD,
        ledgerRecords: { first: transaction, second: {} },
        intouchResponses: { first: {}, second: {} },
        clientTimestamp: '0'
    }

    writeBatch
        .update(senderRef, { wallet: { fcfa: senderNewFcfaBalance, points: senderInfo.wallet.points } })
        .set(senderTransacRef, transactionRecord)
        .set(receiverTransacRef, transactionRecord)

    //Write changes to firestore
    try {
        await writeBatch.commit()
    } catch (error) {
        console.log(error)

        /* ROLL BACK CHANGES TO LEDGER */

        throw new functions.https.HttpsError('internal', 'Transaction failed. Changes rolled back')
    }

    /* SEND NOTIFICATION TO RECEIVER */
    try {
        await notify(receiverInfo.notificationToken, `${senderInfo.firstName} ${senderInfo.lastName} vous a envoye ${amount}`, '')
    } catch (error) {
        console.log(error)
    }
}


/**
 * 
 * FOR BETA
 */
export async function receiveTokens(
    data: {
        uid: string,
        transactionId: string,
    }) {
    const { transactionId } = data
    const receiverUid = data.uid

    if (transactionId === undefined || receiverUid === undefined) {
        throw new functions.https.HttpsError('failed-precondition', 'TransactionId, receiverUid and passPhrase required')
    }

    /* FIND RECEIVER */
    let receiverInfo
    try {
        receiverInfo = await findUser({ uid: receiverUid })
    } catch (error) {
        console.log(error)
        throw new functions.https.HttpsError('not-found', 'Can\'t find receiver in database')
    }

    //If user object is undefined, let client know
    if (receiverInfo === undefined) {
        throw new functions.https.HttpsError('not-found', 'Can\'t find receiver in database')
    }

    /* GET TRANSACTION FROM FIRESTORE AND CHECK THAT STATUS IS ONHOLD */
    let transactionRecord
    try {
        transactionRecord = await db.collection('users-beta').doc(receiverUid).collection('transactions').doc(transactionId).get()
    } catch (error) {
        console.log(error)
        throw new functions.https.HttpsError('internal', 'An error happened while reading transaction from firestore')
    }


    //********************************************************************************************** */
    //if transaction does exist in database
    if (transactionRecord.exists) {
        transactionRecord = transactionRecord.data() as TransactionRecord
    } else {
        throw new functions.https.HttpsError('not-found', 'Can\'t find transaction in database')
    }

    //if transaction status is accepted or declined
    if (transactionRecord.status === TransactionStatus.ACCEPTED || transactionRecord.status === TransactionStatus.DECLINED) {
        throw new functions.https.HttpsError('failed-precondition', `Cannot cash in ${transactionRecord.status} transactions`)
    }
    //*********************************************************************************************** */


    /* TRANSFER TOKENS FROM SOURCE TO DESTINATION ON LEDGER */
    let transaction
    try {
        transaction = await writeTransactionToLedger(TransactionType.TRANSFER, transactionRecord.amount,
            { sourceAccountId: transactionRecord.sender.uid, destinationAccountId: transactionRecord.receiver.uid })
    } catch (error) {
        console.log(error)
        throw new functions.https.HttpsError('internal', 'Could not transfer tokens')
    }

    /* WRITE CHANGES TO FIRESTORE */
    const receiverNewFcfaBalance = receiverInfo.wallet.fcfa + transactionRecord.amount;

    const writeBatch = db.batch()
    const senderRef = db.collection('users-beta').doc(transactionRecord.sender.uid)
    const receiverRef = db.collection('users-beta').doc(transactionRecord.receiver.uid)
    const senderTransacRef = senderRef.collection('transactions').doc(transactionRecord.ledgerRecords.first.id)
    const receiverTransacRef = receiverRef.collection('transactions').doc(transactionRecord.ledgerRecords.first.id)

    writeBatch
        .update(receiverRef, { wallet: { fcfa: receiverNewFcfaBalance, points: receiverInfo.wallet.points } })
        .update(senderTransacRef, { status: TransactionStatus.ACCEPTED, ledgerRecords: { first: transactionRecord.ledgerRecords.first, second: transaction } })
        .update(receiverTransacRef, { status: TransactionStatus.ACCEPTED, ledgerRecords: { first: transactionRecord.ledgerRecords.first, second: transaction } })

    //Write changes to firestore
    try {
        await writeBatch.commit()
    } catch (error) {
        console.log(error)

        /* ROLL BACK CHANGES TO LEDGER */

        throw new functions.https.HttpsError('internal', 'Transaction failed. Changes rolled back')
    }

    /* NOTIFY SENDER */
    let senderInfo
    try {
        senderInfo = await findUser({ uid: transactionRecord.sender.uid })
    } catch (error) {
        console.log(error)
    }

    if (senderInfo !== undefined) {
        try {
            await notify(senderInfo.notificationToken, `${receiverInfo.firstName} ${receiverInfo.lastName} a encaisse votre transfert de ${transactionRecord.amount}`, '',
                { transactionId: transactionId })
        } catch (error) {
            console.log(error)
        }
    }
}

function trimCountryCode(phoneNumber: string) {
    return phoneNumber.replace('+226', '')
}
