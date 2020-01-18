import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as _ from './helper'
import * as mixpanel from 'mixpanel'
import * as Sentry from '@sentry/browser';

mixpanel.init("c34d5f963b5bd96ef4b081a908d456db")


Sentry.init({
    dsn: 'https://7960a3ba2d5f4b14a6e31a6acb9cfec3@sentry.io/1776947',
    // ...
  });

/**
 * Login function
 * 
 * @param data
 * {
 *   ...
 *   handle: string,
 *   password: string
 *   ...
 * }
 * 
 * @param context
 * 
 * @returns {token: string} when successful; otherwise, error response
 *          In case of errors, return exception with message
 *          '1-Handle not found' or '2-Incorrect password'
 */
exports.login = functions.https.onCall(async (
    data: {
        handle: string,
        password: string
    },
    context) => {
    const { handle, password } = data

    if (((typeof handle === 'string') && handle.length > 0)
        && ((typeof password === 'string') && password.length > 0)) {
        let userSnapshot
        try {
            userSnapshot = await _.db.collection('users-beta').where('handle', '==', handle).get()
        } catch (error) {
            Sentry.captureException(new Error(' not-found ' + `${_.Errors.handleNotFound.code}-${_.Errors.handleNotFound.message}`));
            throw new functions.https.HttpsError('not-found', `${_.Errors.handleNotFound.code}-${_.Errors.handleNotFound.message}`)
        }

        if (!userSnapshot.empty) {
            let uid
            let token //The token to be returned to the client
            uid = userSnapshot.docs[0].id

            //Get stored password
            const user = userSnapshot.docs[0].data()

            //Comparing submitted password hash value to stored hash
            const match = await _.compareToHash(password, user.password)
            if (!match) {
                Sentry.captureException(new Error(' not-found ' +  `${_.Errors.incorrectPassword.code}-${_.Errors.incorrectPassword.message}`))

                throw new functions.https.HttpsError('not-found', `${_.Errors.incorrectPassword.code}-${_.Errors.incorrectPassword.message}`) 
            }

            try {
                token = await admin.auth().createCustomToken(uid)
            } catch (error) {
                console.log('Error creating custom token:', error)
                Sentry.captureException(new Error('Error creating custom token: ' + `${error}`));
                throw new functions.https.HttpsError('unknown', 'Error creating custom token')
            }

            return { token: token }
        } else {
            Sentry.captureException(new Error(' not-found ' + `${_.Errors.handleNotFound.code}-${_.Errors.handleNotFound.message}`));
            throw new functions.https.HttpsError('not-found', `${_.Errors.handleNotFound.code}-${_.Errors.handleNotFound.message}`)
        }

    } else {
        Sentry.captureException(new Error('invalid-argument' + `${'All the user\'s information must be non empty strings'}`));
        throw new functions.https.HttpsError('invalid-argument', 'All the user\'s information must be non empty strings')
    }
})





/**
 * Create a new user and assigns them a unique handle
 * 
 * @param data
 * {
 *   ...
 *   from: string,
 *   to: string,
 *   type: string,
 *   message: string,
 *   ...
 * }
 * 
 * @param context
 * 
 * @returns An object containing the new user's information (Check UserRecord in helper.ts)
 *          When phone number exists, return message '4-Duplicate phone number'
 */




/**
 * Create a new user and assigns them a unique handle
 * 
 * @param data
 * {
 *   ...
 *   firstName: string,
 *   lastName: string,
 *   birthday: string,
 *   gender: string,
 *   city: string,
 *   country: string,
 *   phoneNumber: string,
 *   email?: string,
 *   password: string,
 *   referrerHandle?: string,
 *   notificationToken?: string
 *   ...
 * }
 * 
 * @param context
 * 
 * @returns An object containing the new user's information (Check UserRecord in helper.ts)
 *          When phone number exists, return message '4-Duplicate phone number'
 */
exports.createUser = functions.https.onCall(async (
    data: {
        uid?: string,
        firstName: string,
        lastName: string,
        handle: string,
        birthday: string,
        gender: string,
        city: string,
        country: string,
        phoneNumber: string,
        email?: string,
        password: string,
        referrer?: {
            handle: string,
            nonce: string
        },
        notificationToken?: string
    },
    context) => {
    const usersRef = _.db.collection('users-beta')
    const { uid, firstName, lastName, handle, birthday, gender, city, country, phoneNumber, email, password, referrer, notificationToken } = data

    //Check data sanity
    if (((typeof firstName === 'string') && firstName.length > 0)
        && ((typeof lastName === 'string') && lastName.length > 0)
        && ((typeof handle === 'string') && handle.length > 0)
        && ((typeof birthday === 'string') && birthday.length > 0)
        && ((typeof gender === 'string') && gender.length > 0)
        && ((typeof city === 'string') && city.length > 0)
        && ((typeof country === 'string') && country.length > 0)
        && ((typeof phoneNumber === 'string') && phoneNumber.length > 0)
        && ((typeof password === 'string') && password.length >= 8)) {  //ADDRESS THIS LATER
        /* MAKE SURE PHONE NUMBER IS UNIQUE */
        let userRecord
        try {
            userRecord = await _.findUser({ phoneNumber: phoneNumber })
        } catch (error) {
            console.log(error)
            Sentry.captureException(new Error('Error' + `${error}`));

        }
        if (userRecord !== undefined) {
            Sentry.captureException(new Error('Error' + `${_.Errors.duplicatePhoneNumber.code}-${_.Errors.duplicatePhoneNumber.message}`));
            throw new functions.https.HttpsError('already-exists', `${_.Errors.duplicatePhoneNumber.code}-${_.Errors.duplicatePhoneNumber.message}`)
        }

        /* MAKE SURE HANDLE IS UNIQUE */
        try {
            userRecord = await _.findUser({ handle: handle })
        } catch (error) {
            console.log(error)
            Sentry.captureException(new Error('Error' + `${error}`));

        }
        if (userRecord !== undefined) {
            Sentry.captureException(new Error('already-exists' + `${_.Errors.duplicateHandle.code}-${_.Errors.duplicateHandle.message}`));

            throw new functions.https.HttpsError('already-exists', `${_.Errors.duplicateHandle.code}-${_.Errors.duplicateHandle.message}`)
        }

        /* AT THIS POINT, THE PHONE NUMBER DOESN'T EXIST IN FIRESTORE */

        //The user unique id
        let userId: string

        //Password hashing
        const hash = await _.getHash(password)

        /* REFERRAL LOGIC */
        if (referrer !== undefined) {
            console.log('refereer '+referrer.handle)
            await _.referralLogic(referrer.handle).then((val) =>{
                console.log('loading referer account '+val)
            }) .catch((onError) => {
                console.log('Unable to load referer')
            })
        }

        const newUser: _.UserRecord = {
            uid: '',
            handle: handle,
            firstName: firstName,
            lastName: lastName,
            birthday: birthday,
            gender: gender,
            status: 'unverified',
            city: city,
            country: country,
            phoneNumber: phoneNumber,
            email: email || '',
            password: hash,
            wallet: {
                fcfa: 0,
                points: 0
            },
            stats: {
                totalReceived: 0,
                totalSent: 0,
                totalSaved: 0,
            },
            referrer: referrer || { handle: '', nonce: '' },
            notificationToken: notificationToken || ''
        }

        /* INSERT USER IN FIRESTORE */
        userId = uid || usersRef.doc().id
        delete newUser.uid //To avoid having the UID as a field in the database
        try {
            await usersRef.doc(userId).set(newUser)
        } catch (error) {
            Sentry.captureException(new Error('unknown' + 'Could not create user in firestore'));

            throw new functions.https.HttpsError('unknown', 'Could not create user in firestore')
        }

        /* INSERT USER IN FIREBASE AUTH */
        const stringEmail = email || ''
        try {
           
            await admin.auth().createUser({
                uid: uid,
                email: stringEmail,
                phoneNumber: phoneNumber,
                displayName: `${firstName} ${lastName}`,
            })

        } catch (error) {
            console.log(error)
            let user
            if (error.code === 'auth/email-already-exists') {
                user = await admin.auth().getUserByEmail(stringEmail)
                await admin.auth().deleteUser(user.uid)

            } else if (error.code === 'auth/phone-number-already-exists') {
                user = await admin.auth().getUserByPhoneNumber(phoneNumber)
                await admin.auth().deleteUser(user.uid)
            }
            await admin.auth().createUser({
                uid: uid,
                email: stringEmail,
                phoneNumber: phoneNumber,
                displayName: `${firstName} ${lastName}`,
            })
        }

        /* VERIFY EMAIL */
        //Generate custom token
        let token
        try {
            token = await admin.auth().createCustomToken(userId)
        } catch (error) {
            console.log('Error creating custom token: ', error)
            Sentry.captureException(new Error('Error creating custom token: ' + error));
            throw new functions.https.HttpsError('unknown', 'Error creating custom token')
        }

        //Exchange custom token for id token
        const exchangeOptions = {
            method: 'POST',
            uri: _.ID_TOKEN_ENDPOINT,
            body: {
                token: token,
                returnSecureToken: true
            },
            json: true
        }
        let resp
        try {
            resp = await _.rp(exchangeOptions)
        } catch (error) {
            console.log('Failed to exchange custom token for id token')
            console.log(error)
            Sentry.captureException(new Error('Failed to exchange custom token for id token' + error));

        }

        //Send email
        const verifOptions = {
            method: 'POST',
            uri: _.EMAIL_VERIFICATION_ENDPOINT,
            headers: {
                'X-Firebase-Locale': 'fr'
            },
            body: {
                requestType: 'VERIFY_EMAIL',
                idToken: resp.idToken
            },
            json: true
        }

        try {
            await _.rp(verifOptions)
        } catch (error) {
            console.log('Failed to send verification email')
            console.log(error)
            Sentry.captureException(new Error('Failed to send verification email' + error));

        }

        /* CREATE USER'S SEQUENCE ACCOUNT */
        const seqAcc: _.SequenceAccount = {
            id: userId,
            keyIds: ['root'],
            tags: { type: 'consumer' }
        }

        try {
            await _.ledger.accounts.create(seqAcc)

            await _.writeTransactionToLedger(_.TransactionType.CASHIN, 0, { destinationAccountId: uid },)

           // await _.notify(notificationToken || '', `Bienvenue à sur DuniaPay!`, 'Voici 50.000 pour tester la plateforme')
        } catch (error) {
            Sentry.captureException(new Error('Error' + error));

            console.log(error)

            /* ROLL BACK CHANGES IN FIRESTORE */

            throw new functions.https.HttpsError('unknown', 'Could not create user account on Sequence')
        }

        /* SEND RESPONSE TO CLIENT */
        newUser.uid = userId //Restore UID and send user object to client
        return { user: newUser }
    } else {
        Sentry.captureException(new Error('Error' + 'All the user\'s information must be non empty strings'));
        throw new functions.https.HttpsError('invalid-argument', 'All the user\'s information must be non empty strings')
    }
})

/**
 * Checks whether a handle or a phone number is in firestore
 * 
 * @returns {exists: bool}
 */
exports.exists = functions.https.onCall(async (
    data: {
        handle?: string,
        phoneNumber?: string
    },
    context) => {
    const { handle, phoneNumber } = data

    if (handle == undefined && phoneNumber == undefined) return { exists: true }

    return (await _.findUser({ handle: handle, phoneNumber: phoneNumber })) === undefined ? { exists: false } : { exists: true }
})

/**
 * Checks whether a batch of phoneNumbers exist
 * 
 * @returns bool[]
 */
exports.numbersExist = functions.https.onCall(async (
    data: {
        phoneNumbers: string[]
    },
    context) => {
    const { phoneNumbers } = data

    if (phoneNumbers == undefined || phoneNumbers.length === 0) {
        throw new functions.https.HttpsError('failed-precondition', 'Array of numbers mustn\'t be empty')
    }

    const exists: boolean[] = []

    for (const number of phoneNumbers) {
        (await _.findUser({ phoneNumber: number })) === undefined ? exists.push(false) : exists.push(true)
    }

    return { exists: exists }
})

/**
 * Returns a user's data
 * 
 * @returns A UserRecord object (check helper.ts)
 */
exports.getUser = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'A user must be authenticated')
    }

    const user = await _.findUser({ uid: context.auth.uid })
    if (user !== undefined) {
        return { user: user }
    } else {
        throw new functions.https.HttpsError('not-found', 'No user found in the database')
    }
})

/**
 * Verifies that the one time code generated for the user is valid
 * @param data
 * {
 *   oobCode: string
 * }
 * 
 * @returns {verified: boolean}
 */
exports.verifyPasswordResetCode = functions.https.onCall(async (
    data: {
        oobCode: string,
    },
    context) => {
    const { oobCode } = data
    const options = {
        method: 'POST',
        uri: _.PASSWORD_RESET_ENDPOINT,
        body: {
            oobCode: oobCode,
        },
        json: true
    }

    try {
        await _.rp(options)
        return { verified: true }
    } catch (error) {
        console.log(error)
        return { verified: false }
    }
})

/**
 * Resets a user's password
 * @param data
 * {
 *   oobCode: string
 *   newPassword: string
 * }
 * 
 * @returns {reset: boolean}
 */
exports.resetPassword = functions.https.onCall(async (
    data: {
        oobCode: string,
        newPassword: string
    },
    context) => {
    const { oobCode, newPassword } = data
    const options = {
        method: 'POST',
        uri: _.PASSWORD_RESET_ENDPOINT,
        body: {
            oobCode: oobCode,
            newPassword: newPassword
        },
        json: true
    }

    let res
    try {
        res = await _.rp(options)
    } catch (error) {
        console.log(error)
        return { reset: false }
    }

    try {
        const user = await _.findUser({ email: res.email })
        if (user === undefined) return { reset: false }
        const hash = await _.getHash(newPassword)
        await _.db.collection('users-beta').doc(user.uid).update({ password: hash })

        return { reset: true }
    } catch (error) {
        console.log(error)
        return { reset: false }
    }
})

/**
 * Link sent to users, by firebase auth, for password reset
 */
exports.emailManagement = functions.https.onRequest(async (req, res) => {
    const { oobCode, mode } = req.query
    if (oobCode === undefined || mode === undefined) res.end()

    switch (mode) {
        case 'resetPassword':
            /* GENERATE DYNAMIC LINK */
            let deepLink = `https://www.example.com/?oobCode=${oobCode}`
            deepLink = encodeURIComponent(deepLink)

            const dynamicLink = `https://duniapay.page.link/?link=${deepLink}&apn=com.duniapay.africa`

            /* REDIRECT */
            res.redirect(dynamicLink)
            break

        case 'verifyEmail':
            const options = {
                method: 'POST',
                uri: _.EMAIL_CONFIRMATION_ENDPOINT,
                body: {
                    oobCode: oobCode,
                },
                json: true
            }

            try {
                await _.rp(options)
            } catch (error) {
                console.log(error)
            }

            res.end()
            break

        default: break
    }
    res.end()
})

/**
 * Updates a user's data
 * 
 * @param data
 * {
 *   ...
 *   firstName?: string,
 *   lastName?: string,
 *   birthday?: string,
 *   gender?: string,
 *   city?: string,
 *   country?: string,
 *   phoneNumber?: string,
 *   password?: string,
 *   notificationToken?: string
 *   ...
 * }
 * 
 * @param context
 * 
 * @returns {message: 'User updated'} when successful; otherwise, error response
 */
exports.updateUser = functions.https.onCall(async (
    data: {
        firstName?: string,
        lastName?: string,
        birthday?: string,
        gender?: string,
        city?: string,
        country?: string,
        phoneNumber?: string, //WE NEED TO VERIFY THE NEW ONE
        password?: string,
        notificationToken?: string
    },
    context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'A user must be authenticated')
    }

    const { firstName, lastName, birthday, gender, city, country, phoneNumber, password, notificationToken } = data
    const changes: any = {}

    //Only change valid attributes
    if ((typeof firstName === 'string') && firstName.length > 0) {
        changes.firstName = firstName
    }
    if ((typeof lastName === 'string') && lastName.length > 0) {
        changes.lastName = lastName
    }
    if ((typeof birthday === 'string') && birthday.length > 0) {
        changes.birthday = birthday
    }
    if ((typeof gender === 'string') && gender.length > 0) {
        changes.gender = gender
    }
    if ((typeof city === 'string') && city.length > 0) {
        changes.city = city
    }
    if ((typeof country === 'string') && country.length > 0) {
        changes.country = country
    }
    if ((typeof phoneNumber === 'string') && phoneNumber.length > 0) {
        changes.phoneNumber = phoneNumber
    }
    if ((typeof password === 'string') && password.length > 0) {
        const hash = await _.getHash(password)
        changes.password = hash
    }
    if ((typeof notificationToken === 'string') && notificationToken.length > 0) {
        changes.notificationToken = notificationToken
    }
    /* WE REALLY SHOULDN'T UPDATE THE WALLET HERE BY BYPASSING SEQUENCE */

    //Apply changes
    try {
        await _.db.collection('users-beta').doc(context.auth.uid).update(changes)
    } catch (error) {
        console.log(error)
        throw new functions.https.HttpsError('unknown', 'Could not apply changes')
    }

    /* SEND RESPONSE TO CLIENT */
    return { message: 'User updated' }
})

/* *
 * Deletes a user's record
 * 
 * LEAVE FOR LATER
 */
// exports.deleteUser = functions.https.onCall(async (data, context) => {

// })

/**
 * Returns a user's transaction history
 * 
 * @returns {
 *            ...
 *            {
 *              
 *            }
 *            ...
 *          }
 */
exports.getHistory = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'A user must be authenticated')
    }

    const user = await _.findUser({ uid: context.auth.uid })
    if (user !== undefined) {
        const query = await _.db.collection('users-beta').doc(user.uid).collection('transactions').get()

        if (!query.empty) {
            const transactions: object[] = []

            for (const doc of query.docs) {
                const payload = doc.data()

                /* GET USERS INFO */
                const sender = await _.findUser({ uid: payload.senderUid })
                const receiver = await _.findUser({ uid: payload.receiverUid })

                /* ADD CONTEXTUAL INFO */
                payload.transactionId = doc.id
                payload.timestamp = payload.ledgerRecords.first.timestamp
                if (sender !== undefined && receiver !== undefined) {
                    payload.senderName = `${sender.firstName} ${sender.lastName}`
                    payload.receiverName = `${receiver.firstName} ${receiver.lastName}`
                    payload.senderHandle = sender.handle
                    payload.receiverHandle = receiver.handle
                }

                /* REMOVE SENSITIVE INFO */
                delete payload.intouchResponses
                delete payload.ledgerRecords
                delete payload.passPhrase

                transactions.push(payload)
            }
            return { transactions: transactions }
        } else {
            return { transactions: [] }
        }
    } else {
        throw new functions.https.HttpsError('not-found', 'User not found')
    }
})

/**
 * Returns the status of a transaction
 * 
 * @param data
 * {
 *   ...
 *   transactionId: string,
 *   ...
 * }
 * 
 * @param context
 * 
 * @returns A transaction record as stored in firestore (check type TransactionRecord in helper.ts)
 */
exports.getTransaction = functions.https.onCall(async (
    data: {
        transactionId: string
    },
    context) => {
    const { transactionId } = data

    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'A user must be authenticated')
    }

    if ((typeof transactionId === 'string') && transactionId.length > 0) {
        let transaction = await _.findTransaction(transactionId, { senderUid: context.auth.uid })
        if (transaction === undefined) { transaction = await _.findTransaction(transactionId, { receiverUid: context.auth.uid }) }

        if (transaction !== undefined) {
            const payload = <any>transaction

            /* GET USERS INFO */
            const sender = await _.findUser({ uid: payload.senderUid })
            const receiver = await _.findUser({ uid: payload.receiverUid })

            /* ADD CONTEXTUAL INFO */
            payload.transactionId = transactionId
            payload.timestamp = payload.ledgerRecords.first.timestamp
            if (sender !== undefined && receiver !== undefined) {
                payload.senderName = `${sender.firstName} ${sender.lastName}`
                payload.receiverName = `${receiver.firstName} ${receiver.lastName}`
                payload.senderHandle = sender.handle
                payload.receiverHandle = receiver.handle
            }

            /* REMOVE SENSITIVE INFO */
            delete payload.intouchResponses
            delete payload.ledgerRecords
            delete payload.passPhrase

            return { transaction: payload }
        } else {
            throw new functions.https.HttpsError('not-found', 'Could not find transaction record for this user')
        }
    } else {
        throw new functions.https.HttpsError('invalid-argument', 'Could not find transaction record')
    }
})

/**
 * Logic to send funds from one user to another
 * 
 * @param data
 * {
 *   ...
 *   amount: int,
 *   receiver:
 *   {
 *     uid?: string,
 *     handle?: string,
 *     email?: string,
 *     phoneNumber?: string
 *   },
 *   passPhrase: string
 *   ...
 * }
 * 
 * @param context
 * 
 * @returns In case of errors, return message '3-Receiver not found' or '5-Insufficiant funds'
 *          or '8-Amount cannot be negative'
*/
exports.sendTokens = functions.https.onCall(async (
    data: {
        amount: number,
        receiver: {
            uid?: string,
            handle?: string,
            email?: string,
            phoneNumber?: string
        },
        passPhrase: string,
        clientTimestamp: string
    },
    context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'A user must be authenticated')
    }

    const { amount, receiver, passPhrase,} = data

    if ((typeof amount !== 'number') || amount <= 0) throw new functions.https.HttpsError('invalid-argument',
        `${_.Errors.negativeAmount.code}-${_.Errors.negativeAmount.message}`
    )
   
    /* MAKE SURE TRANSFER IS FEASIBLE */
    const { senderInfo, receiverInfo } = await _.validateTransfer(context.auth.uid, amount, receiver) //Returns sender's and receiver's info

    /* PUT SENDER'S TOKENS ON HOLD */
    let transaction
    try {
        transaction = await _.writeTransactionToLedger(_.TransactionType.RESERVATION, amount,
            { sourceAccountId: senderInfo.uid, destinationAccountId: receiverInfo.uid },)
    } catch (error) {
        console.log(error)
        throw new functions.https.HttpsError('internal', 'Could not put tokens on hold for transfer')
    }

    /* UPDATE SENDER'S BALANCE AND ADD TRANSACTION IN BOTH ACCOUNTS */
    const writeBatch = _.db.batch()
    const senderRef = _.db.collection('users-beta').doc(senderInfo.uid)
    const receiverRef = _.db.collection('users-beta').doc(receiverInfo.uid)
    const senderTransacRef = senderRef.collection('transactions').doc(transaction.id)   //The transaction ID in the database will be
    //the ID of the first ledger record pertaining
    //to this transfer
    const receiverTransacRef = receiverRef.collection('transactions').doc(transaction.id)
    const senderNewFcfaBalance = senderInfo.wallet.fcfa - amount

    const transactionRecord: _.TransactionRecord = {
        type: _.TransactionType.TRANSFER,
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
        status: _.TransactionStatus.ONHOLD,
        ledgerRecords: { first: transaction, second: {} },
        intouchResponses: { first: {}, second: {} },
        clientTimestamp: data.clientTimestamp
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
        await _.notify(receiverInfo.notificationToken, `${senderInfo.firstName} ${senderInfo.lastName} vous a envoye ${amount}`, '',
            {
                senderName: `${senderInfo.firstName} ${senderInfo.lastName}`,
                receiverName: '',
                transactionId: transaction.id,
                amount: `${amount}`,
                direction: 'IN'
            })
    } catch (error) {
        console.log(error)
    }

    /* SEND RESPONSE TO CLIENT */
    return {
        message: 'Transaction pending',
        transactionId: transaction.id
    }
})

/**
 * Logic to send funds from an existing user to an unexisting one
 * 
 * @param data
 * {
 *   ...
 *   amount: int,
 *   passPhrase: string,
 *   clientTimestamp: string,
 *   nonce?: string (random number)
 *   ...
 * }
 * 
 * @param context
 * 
*/
exports.sendInvitationTokens = functions.https.onCall(async (
    data: {
        amount: number,
        passPhrase: string,
        clientTimestamp: string,
        nonce: string
    },
    context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'A user must be authenticated')
    }

    const { amount, passPhrase, nonce } = data

    if ((typeof amount !== 'number') || amount <= 0) throw new functions.https.HttpsError('invalid-argument',
        `${_.Errors.negativeAmount.code}-${_.Errors.negativeAmount.message}`
    )

    /* MAKE SURE TRANSACTION IS FEASIBLE */
    const senderInfo = await _.findUser({ uid: context.auth.uid });

    if (senderInfo === undefined) {
        throw new functions.https.HttpsError('not-found', 'Can\'t find sender\'s info')
    }

    /* IF SENDER DOES NOT HAVE ENOUGH FUNDS, REJECT */
    if (senderInfo.wallet.fcfa < amount) {
        throw new functions.https.HttpsError('failed-precondition', `${_.Errors.insufficiantFunds.code}-${_.Errors.insufficiantFunds.message}`)
    }


     
    /* PUT SENDER'S TOKENS ON HOLD */
    let transaction
    try {
        transaction = await _.writeTransactionToLedger(_.TransactionType.RESERVATION, amount, { sourceAccountId: senderInfo.uid, destinationAccountId: nonce },)
    } catch (error) {
        console.log(error)
        throw new functions.https.HttpsError('internal', 'Could not put tokens on hold for transfer')
    }

    /* UPDATE SENDER'S BALANCE */
    const writeBatch = _.db.batch()
    const senderRef = _.db.collection('users-beta').doc(senderInfo.uid)
    const senderTransacRef = senderRef.collection('transactions').doc(transaction.id)
    const senderNewFcfaBalance = senderInfo.wallet.fcfa - amount

    const transactionRecord: _.TransactionRecord = {
        type: _.TransactionType.INVITATION,
        sender: {
            uid: senderInfo.uid,
            handle: senderInfo.handle,
            firstName: senderInfo.firstName,
            lastName: senderInfo.lastName
        },
        receiver: {
            uid: '',
            handle: '',
            firstName: '',
            lastName: ''
        },
        amount: amount,
        passPhrase: passPhrase,
        status: _.TransactionStatus.ONHOLD,
        ledgerRecords: { first: transaction, second: {} },
        intouchResponses: { first: {}, second: {} },
        clientTimestamp: data.clientTimestamp,
        nonce: nonce
    }

    writeBatch
        .update(senderRef, { wallet: { fcfa: senderNewFcfaBalance, points: senderInfo.wallet.points } })
        .set(senderTransacRef, transactionRecord)

    //Write changes to firestore
    try {
        await writeBatch.commit()
    } catch (error) {
        console.log(error)

        /* ROLL BACK CHANGES TO LEDGER */

        throw new functions.https.HttpsError('internal', 'Transaction failed. Changes rolled back')
    }
})

/**
 * Logic to deposit funds
 * 
 * @param data
 * {
 *   ...
 *   transactionId: string,
 *   passPhrase: string
 *   ...
 * }
 * 
 * @param context
 * 
 * @returns When passPhrase doesn't match the record, return message '6-Invalid pass phrase'
 */
exports.receiveTokens = functions.https.onCall(async (
    data: {
        transactionId: string,
        passPhrase: string
    },
    context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'A user must be authenticated')
    }

    const { transactionId, passPhrase } = data
    const receiverUid = context.auth.uid

    if (transactionId === undefined || receiverUid === undefined || passPhrase === undefined) {
        Sentry.captureException(new Error('failed-precondition'+' TransactionId, receiverUid and passPhrase required'))

        throw new functions.https.HttpsError('failed-precondition', 'TransactionId, receiverUid and passPhrase required')
    }

    /* FIND RECEIVER */
    let receiverInfo
    try {
        receiverInfo = await _.findUser({ uid: receiverUid })
    } catch (error) {
        console.log(error)
        Sentry.captureException(new Error('not-found '+' Can\'t find receiver in database'))

        throw new functions.https.HttpsError('not-found', 'Can\'t find receiver in database')
    }
    //If user object is undefined, let client know
    if (receiverInfo === undefined) {
        Sentry.captureException(new Error( 'not-found ' + ' Can\'t find receiver in database'))

        throw new functions.https.HttpsError('not-found', 'Can\'t find receiver in database')
    }

    /* GET TRANSACTION FROM FIRESTORE AND CHECK THAT STATUS IS ONHOLD */
    let transactionRecord
    try {
        transactionRecord = await _.db.collection('users-beta').doc(receiverUid).collection('transactions').doc(transactionId).get()
    } catch (error) {
        console.log(error)
        Sentry.captureException(new Error( 'Receive Token' + 'An error happened while reading transaction from firestore'))

        throw new functions.https.HttpsError('internal', 'An error happened while reading transaction from firestore')
    }


    //********************************************************************************************** */
    //if transaction does exist in database
    if (transactionRecord.exists) {
        transactionRecord = transactionRecord.data() as _.TransactionRecord
    } else {
        throw new functions.https.HttpsError('not-found', 'Can\'t find transaction in database')
    }

    //if transaction status is accepted or declined
    if (transactionRecord.status !== _.TransactionStatus.ONHOLD) {
        throw new functions.https.HttpsError('failed-precondition', 'Transaction status is not onhold')
    }

    //if transaction passPhrase does not match passPhrase provided
    if (transactionRecord.passPhrase !== passPhrase) {
        throw new functions.https.HttpsError('permission-denied', `${_.Errors.invalidPassPhrase.code}-${_.Errors.invalidPassPhrase.message}`)
    }
    //*********************************************************************************************** */



    /* TRANSFER TOKENS FROM SOURCE TO DESTINATION ON LEDGER */
    let transaction
    try {
        transaction = await _.writeTransactionToLedger(_.TransactionType.TRANSFER, transactionRecord.amount,
            { sourceAccountId: transactionRecord.sender.uid, destinationAccountId: transactionRecord.receiver.uid},)
    } catch (error) {
        console.log(error)
        throw new functions.https.HttpsError('internal', 'Could not transfer tokens')
    }

    /* GET SENDER'S INFO */
    let senderInfo
    try {
        senderInfo = await _.findUser({ uid: transactionRecord.sender.uid })
    } catch (error) {
        console.log(error)
        throw new functions.https.HttpsError('not-found', 'Can\'t find sender in database')
    }
    //If user object is undefined, let client know
    if (senderInfo === undefined) {
        throw new functions.https.HttpsError('not-found', 'Can\'t find sender in database')
    }

    /* WRITE CHANGES TO FIRESTORE */
    const receiverNewFcfaBalance = receiverInfo.wallet.fcfa + transactionRecord.amount;

    const writeBatch = _.db.batch()
    const senderRef = _.db.collection('users-beta').doc(transactionRecord.sender.uid)
    const receiverRef = _.db.collection('users-beta').doc(transactionRecord.receiver.uid)
    const senderTransacRef = senderRef.collection('transactions').doc(transactionRecord.ledgerRecords.first.id)
    const receiverTransacRef = receiverRef.collection('transactions').doc(transactionRecord.ledgerRecords.first.id)

    writeBatch
        .update(receiverRef,
            {
                wallet: { fcfa: receiverNewFcfaBalance, points: receiverInfo.wallet.points },
                stats: {
                    totalReceived: receiverInfo.stats.totalReceived + transactionRecord.amount,
                    totalSent: receiverInfo.stats.totalSent,
                    totalSaved: receiverInfo.stats.totalSaved
                }
            })
        .update(senderRef,
            {
                stats: {
                    totalReceived: senderInfo.stats.totalReceived,
                    totalSent: senderInfo.stats.totalSent + transactionRecord.amount,
                    totalSaved: senderInfo.stats.totalSaved + _.getSavings(transactionRecord.amount)
                }
            })
        .update(senderTransacRef, { status: _.TransactionStatus.ACCEPTED, ledgerRecords: { first: transactionRecord.ledgerRecords.first, second: transaction } })
        .update(receiverTransacRef, { status: _.TransactionStatus.ACCEPTED, ledgerRecords: { first: transactionRecord.ledgerRecords.first, second: transaction } })

    //Write changes to firestore
    try {
        await writeBatch.commit()
    } catch (error) {
        console.log(error)

        /* ROLL BACK CHANGES TO LEDGER */

        throw new functions.https.HttpsError('internal', 'Transaction failed. Changes rolled back')
    }

    /* NOTIFY SENDER */
    if (senderInfo !== undefined) {
        try {
            await _.notify(senderInfo.notificationToken, `${receiverInfo.firstName} ${receiverInfo.lastName} a encaisse votre transfert de ${transactionRecord.amount}`, '',
                { transactionId: transactionId })
        } catch (error) {
            console.log(error)
        }
    }

    /* SEND RESPONSE TO CLIENT */
    return {
        message: 'Transaction accepted',
        transactionId: transactionRecord.ledgerRecords.first.id
    }
})

/**
 * Logic to cancel a pending transfer
 * 
 * @param data
 * {
 *    transactionId: string,
 * }
 * 
 * @returns When transaction is not on hold, return message '7-Cannot cancel transaction not on hold'
 */
exports.cancelTransfer = functions.https.onCall(async (
    data:
        {
            transactionId: string,
        },
    context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'A user must be authenticated')
    }

    const { transactionId } = data

    if ((typeof transactionId === 'string') && transactionId.length > 0) {
        const transaction = await _.findTransaction(transactionId, { senderUid: context.auth.uid })

        if (transaction !== undefined) {
            /* CAN ONLY CANCEL TRANSFERS */
            if (transaction.type !== _.TransactionType.TRANSFER && transaction.type !== _.TransactionType.INVITATION)
                throw new functions.https.HttpsError('permission-denied', 'Can only cancel transfers or invitations')

            /* CAN ONLY CANCEL PENDING TRANSACTIONS */
            if (transaction.status !== _.TransactionStatus.ONHOLD) {
                throw new functions.https.HttpsError('permission-denied',
                    `${_.Errors.transactionNotOnHold.code}-${_.Errors.transactionNotOnHold.message}`
                )
            }

            //AT THIS POINT, THE TRANSACTION STATUS IS ON HOLD

           

            /* WRITE CHANGES TO LEDGER */
            let cancel
            try {
                cancel = await _.writeTransactionToLedger(_.TransactionType.CANCELLATION, transaction.amount,
                    {
                        sourceAccountId: transaction.sender.uid,
                        destinationAccountId: transaction.type == _.TransactionType.TRANSFER ? transaction.receiver.uid : transaction.nonce
                    },)
            } catch (error) {
                console.log(error)
                throw new functions.https.HttpsError('internal', 'Could not cancel transaction')
            }

            /* WRITE CHANGES TO FIRESTORE */
            const batch = _.db.batch()
            const senderRef = _.db.collection('users-beta').doc(transaction.sender.uid)
            const senderTransacRef = senderRef.collection('transactions').doc(transaction.ledgerRecords.first.id)

            let senderInfo = (await senderRef.get()).data()
            //Should not happen since transaction was successfully retrieved
            if (senderInfo === undefined) throw new functions.https.HttpsError('not-found', 'Could not find sender\'s record')
            senderInfo = senderInfo as _.UserRecord

            const senderNewFcfaBalance = senderInfo.wallet.fcfa + transaction.amount

            batch
                .update(senderRef, { wallet: { fcfa: senderNewFcfaBalance, points: senderInfo.wallet.points } })
                .update(senderTransacRef, { ledgerRecords: { first: transaction.ledgerRecords.first, second: cancel }, status: _.TransactionStatus.CANCELLED })

            if (transaction.type == _.TransactionType.TRANSFER) {
                const receiverRef = _.db.collection('users-beta').doc(transaction.receiver.uid)
                const receiverTransacRef = receiverRef.collection('transactions').doc(transaction.ledgerRecords.first.id)
                batch.update(receiverTransacRef, { ledgerRecords: { first: transaction.ledgerRecords.first, second: cancel }, status: _.TransactionStatus.CANCELLED })
            }

            try {
                await batch.commit()
            } catch (error) {
                console.log(error)

                /* ROLL BACK CHANGES TO LEDGER */

                throw new functions.https.HttpsError('internal', 'Cancellation failed. Changes rolled back')
            }

            /* SEND RESPONSE TO CLIENT */
            return {
                message: 'transaction cancelled',
                transactionId: transaction.ledgerRecords.first.id
            }
        } else {
            throw new functions.https.HttpsError('not-found', 'Could not find transaction record')
        }
    } else {
        throw new functions.https.HttpsError('invalid-argument', 'Could not find transaction record')
    }
})

/**
 * Sends one time password to client's number for transaction.
 */
exports.sendOtpToClient = functions.https.onCall(async (
    data:
        {
            amount: number,
            phoneNumber: string,
            provider: _.IntouchProvider
        },
    context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'A user must be authenticated')
    }

    const { amount, phoneNumber, provider } = data

    return _.sendOtpToClient(amount, phoneNumber, provider)
})


/**
 * Logic to initiate a cash in/out operation
 * 
 * @param data
 * {
 *   ...
 *   provider: 'ORANGE' | 'TELMOB' | 'TELECEL',
 *   operation: 'CASHIN' | 'CASHOUT' | 'AIRTIME',
 *   amount: number,
 *   otp: string,
 *   ...
 * }
 * 
 * @returns code 200 on transaction pending
 *          In case of errors, return message '5-Insufficiant funds' or '8-Amount cannot be negative'
 */
exports.postIntouch = functions.https.onCall(async (
    data:
        {
            provider: _.IntouchProvider,
            operation: _.IntouchOperation,
            amount: number,
            email : string
            otp: string,
            clientTimestamp: string
        },
    context) => {
    if (!context.auth) {

        throw new functions.https.HttpsError('unauthenticated', 'A user must be authenticated')
    }
    const { provider, operation, amount, otp,} = data

    /* PRELIMINARY VALIDATION */
    if (amount <= 0) throw new functions.https.HttpsError('invalid-argument', `${_.Errors.negativeAmount.code}-${_.Errors.negativeAmount.message}`)
    if (_.INTOUCH_SERVICE[provider][operation].length === 0) throw new functions.https.HttpsError('unimplemented', 'Service not available')

    /* FIND USER */
    const user = await _.findUser({ uid: context.auth.uid })
    if (user === undefined) throw new functions.https.HttpsError('not-found', 'Could not find user')

    /* IF CASHOUT OR AIRTIME OR BILL, MAKE SURE USER HAS ENOUGH FUNDS */
    if (operation === _.IntouchOperation.CASHOUT || operation === _.IntouchOperation.AIRTIME || operation === _.IntouchOperation.BILL) {
        if (user.wallet.fcfa < amount) throw new functions.https.HttpsError('failed-precondition',
            `${_.Errors.insufficiantFunds.code}-${_.Errors.insufficiantFunds.message}`
        )
    }

    // /* GENERATE TRANSACTION ID */
    const transactionId = _.db.collection('users-beta').doc(user.uid).collection('transactions').doc().id
    console.log('transaction id created '+transactionId)
    // /* CALL INTOUCH API */
     
    //  //If transaction failed, stop execution right here
       

    

    //console.log('response '+resp)

    // /* UPDATE LEDGER AND FIRESTORE */
     const batch = _.db.batch()
     const userRef = _.db.collection('users-beta').doc(user.uid)
     const transactionRef = _.db.collection('users-beta').doc(user.uid).collection('transactions').doc(transactionId)
     console.log('transactionRef generated '+transactionRef)

     const record: _.TransactionRecord = {
         type: operation === _.IntouchOperation.CASHIN ? _.TransactionType.CASHIN
             : operation === _.IntouchOperation.CASHOUT ? _.TransactionType.CASHOUT
                 : operation === _.IntouchOperation.AIRTIME ? _.TransactionType.AIRTIME
                     : _.TransactionType.BILL,
         sender: {
             uid: user.uid,
             handle: '',
             firstName: '',
             lastName:  ''
         },
         receiver: {
             uid: '',
             handle: '',
             firstName: '',
             lastName: ''
         },
         amount: amount,
         passPhrase: '',
         status: _.TransactionStatus.ONHOLD,
         ledgerRecords: { first: {}, second: {} },
         intouchResponses: { first: "INITIATED", second: {} },
         clientTimestamp: data.clientTimestamp
     }
     
    
   
     //If CASHOUT OR AIRTIME OR BILL, reserve tokens on ledger
     if (operation === _.IntouchOperation.CASHOUT || operation === _.IntouchOperation.AIRTIME || operation === _.IntouchOperation.BILL) {
     //Ledger
         let transaction
         try {
             transaction = await _.writeTransactionToLedger(_.TransactionType.RESERVATION, amount,
                 { sourceAccountId: user.uid, destinationAccountId: operation},)
         } catch (error) {
             console.log(error)
             throw new functions.https.HttpsError('internal', 'Could not write transaction to ledger')
         }
     //Firestore
         record.ledgerRecords.first = transaction
         batch
             .update(userRef, { wallet: { fcfa: user.wallet.fcfa - amount, points: user.wallet.points } })
             .set(transactionRef, record)

     } else if (operation === _.IntouchOperation.CASHIN) {
         //Firestore
         batch.set(transactionRef, record)
     }

    // /* WRITE TO FIRESTORE */
      try {
          await batch.commit().then((val) => {
              
             console.log('before batch commited')
             console.log('Batch commited')
          })
      } catch (error) {
          console.log(error)
          throw new functions.https.HttpsError('unknown', 'Firestore write failed after intouch api call')
      }
      let resp
      try {
          resp = await _.initiateIntouchTransaction(amount, user.phoneNumber, `${user.uid}|${transactionId}`, provider, operation, otp)
          return resp
      } catch (error) {
          Sentry.captureException(new Error(' aborted ' + ' Intouch transaction failed'));
          throw new functions.https.HttpsError('aborted', 'Intouch transaction failed')
      }
})

/**
 * Callback for Intouch
 */
exports.intouchCallback = functions.https.onRequest(async (req, res) => {
    const { partner_transaction_id, status } = req.body
    if (typeof partner_transaction_id !== 'string' || typeof status !== 'string') { res.end(); return }
    //Extract both from partnerTransactionId
    const [uid, transactionId,] = partner_transaction_id.split('|')

    /* LOOKUP USER AND TRANSACTION */
    const user = await _.findUser({ uid: uid })
    if (user === undefined) { res.end(); return }
    
    const transaction = await _.findTransaction(transactionId, { senderUid: uid })
    if (transaction === undefined) {
        console.log('cannot find transaction')
        Sentry.captureException(new Error('Intouch Callback ' + ' cannot find transaction'));

        res.end(); 
        return 
    }

    /* UPDATE BALANCE ON LEDGER AND FIRESTORE BASED ON STATUS */
    const batch = _.db.batch()
    const userRef = _.db.collection('users-beta').doc(uid)
    const transactionRef = _.db.collection('users-beta').doc(uid).collection('transactions').doc(transactionId)

    
    let ledgerRecord
    if (status === _.IntouchTransactionStatus.SUCCESSFUL) {
        if (transaction.type === _.TransactionType.CASHIN) {
            //WRITE TO LEDGER
            try {
                ledgerRecord = await _.writeTransactionToLedger(transaction.type, transaction.amount, { destinationAccountId: uid }, )
            } catch (error) {
                console.log(error)
                Sentry.captureException(new Error( 'Intouch Callback' + error))
                res.end(); 
                return error
            }
            //Update user balance
            batch.update(userRef, { wallet: { fcfa: user.wallet.fcfa + transaction.amount, points: user.wallet.points } })
            //Update transaction record
            batch.update(transactionRef,
                {
                    status: _.IntouchTransactionStatus.SUCCESSFUL,
                    ledgerRecords: { first: ledgerRecord, second: {} },
                    intouchResponses: { first: transaction.intouchResponses.first, second: req.body }
                }
            )
        } else if (transaction.type === _.TransactionType.CASHOUT || transaction.type === _.TransactionType.AIRTIME || transaction.type === _.TransactionType.BILL) {
            //WRITE TO LEDGER
            try {
                ledgerRecord = await _.writeTransactionToLedger(transaction.type, transaction.amount, { sourceAccountId: uid },)
            } catch (error) {
                Sentry.captureException(new Error( 'Intouch Callback' + error))
                console.log(error)
                res.end(); return
            }

            //Update transaction record
            batch.update(transactionRef,
                {
                    status: _.IntouchTransactionStatus.SUCCESSFUL,
                    ledgerRecords: { first: transaction.ledgerRecords.first, second: ledgerRecord },
                    intouchResponses: { first: transaction.intouchResponses.first, second: req.body }
                }
            )
        }

    } else if (status === _.IntouchTransactionStatus.FAILED) {
        //Update status and save intouch response in transaction record
        batch.update(transactionRef,
            {
                status: _.IntouchTransactionStatus.FAILED,
                intouchResponses: { first: transaction.intouchResponses.first, second: req.body }
            }
        )

        if (transaction.type === _.TransactionType.CASHOUT || transaction.type === _.TransactionType.AIRTIME || transaction.type === _.TransactionType.BILL) {
            //CANCEL TRANSACTION ON LEDGER
            const operation = transaction.type === _.TransactionType.CASHOUT ? _.IntouchOperation.CASHOUT
                : transaction.type === _.TransactionType.AIRTIME ? _.IntouchOperation.AIRTIME
                    : _.IntouchOperation.BILL
            try {
                ledgerRecord = await _.writeTransactionToLedger(_.TransactionType.CANCELLATION, transaction.amount,
                    { sourceAccountId: uid, destinationAccountId: operation },)
            } catch (error) {
                Sentry.captureException(new Error( 'Intouch Callback' + error))

                console.log(error)
                res.end(); return
            }

            //REVERT BALANCE IN FIRESTORE
            batch
                .update(userRef, { wallet: { fcfa: user.wallet.fcfa + transaction.amount, points: user.wallet.points } })
                .update(transactionRef, { ledgerRecords: { first: transaction.ledgerRecords.first, second: ledgerRecord } })
        }
    } else { res.end(); return }

    //Commit batch
    try {
        await batch.commit()
    } catch (error) {
        Sentry.captureException(new Error( 'Intouch Callback' + error))

        console.log(error)
    }

    /* SEND NOTIFICATION TO USER */
    if (status === _.IntouchTransactionStatus.SUCCESSFUL) {
        try {
            switch (transaction.type) {
                case _.TransactionType.CASHIN: {
                    await _.notify(user.notificationToken, `Votre solde a été creditée de ${transaction.amount}`, '', { transactionId: transactionId })
                    break
                }
                case _.TransactionType.CASHOUT: {
                    await _.notify(user.notificationToken, `Votre solde a été debitée de ${transaction.amount}`, '', { transactionId: transactionId })
                    break
                }
                case _.TransactionType.AIRTIME: {
                    await _.notify(user.notificationToken, `Votre achat de ${transaction.amount} d'unités a réussi`, '', { transactionId: transactionId })
                    break
                }
                /* case _.TransactionType.BILL: {
                    
                } */
                default: {
                    break
                }
            }
        } catch (error) {
            console.log(error)
        }
    } else if (status === _.IntouchTransactionStatus.FAILED) {
        try {
            await _.notify(user.notificationToken, `Votre transaction ${transactionId} a echouée`, '', { transactionId: transactionId })
        } catch (error) {
            Sentry.captureException(new Error( 'Intouch Callback' + error))

            console.log(error)
        }
    }
    res.end(); return
})

/**
 * FOR THE FOLLOWING 3 FUNCTIONS, CHECK OUT https://segment.com/docs/sources/server/node/
 */
exports.identify = functions.https.onCall((data, context) => {
    return new Promise((resolve, reject) => {
        _.analytics.identify(data, function (err: any) {
            if (err) reject(err)
            resolve()
        })
    })
})

exports.track = functions.https.onCall((data, context) => {
    return new Promise((resolve, reject) => {
        _.analytics.track(data, function (err: any) {
            if (err) reject(err)
            resolve()
        })
    })
})

exports.page = functions.https.onCall((data, context) => {
    return new Promise((resolve, reject) => {
        _.analytics.page(data, function (err: any) {
            if (err) reject(err)
            resolve()
        })
    })
})

exports.verifyNumber = functions.https.onCall(async (data, context) => {
    const { phoneNumber } = data
    if (typeof phoneNumber !== 'string' || phoneNumber.length === 0) return { verificationStatus: 'failed' }

    try {
        var strCode = '' + (Math.floor(Math.random() * (999999999 - 100000000 + 1)) + 100000000);
        await _.sendSms(phoneNumber, strCode);
        console.log(strCode);
        // const options = {
        //     method: 'POST',
        //     uri: 'https://graph.accountkit.com/v1.3/start_login',
        //     body: {
        //         access_token: 'AA|626617247819718|ed9aa4dc8210ed9e03ab0cf48a125b63',
        //         credentials_type: 'phone_number',
        //         locale: 'fr_FR',
        //         phone_number: phoneNumber,
        //         sdk: 'android',
        //         sms_token: '836528',
        //         response_type: 'code'
        //     },
        //     json: true
        // }
        // const res = await _.rp(options)

        // if (res.error) {
        //     return { verificationStatus: 'failed' }
        // }
        // await _.db.collection('phoneNumberVerification').doc(phoneNumber).set({ login_request_code: res.login_request_code })

        await _.db.collection('phoneNumberVerification').doc(phoneNumber).set({ login_request_code: strCode })

        return { verificationStatus: 'pending' }

    } catch (error) {
        console.log(error)
        return { verificationStatus: 'failed' }
    }
})

exports.confirmNumber = functions.https.onCall(async (data, context) => {
    const { phoneNumber, code } = data
    if ((typeof phoneNumber !== 'string' || phoneNumber.length === 0)
        || (typeof code !== 'string' || code.length === 0)) return

    try {
        const numberRecord = (await _.db.collection('phoneNumberVerification').doc(phoneNumber).get()).data();
        if (numberRecord === undefined)
            return { verificationStatus: 'failed' };
        
        if(code == numberRecord.login_request_code) {
            return { verificationStatus: 'successful' };
        }else {
            return { verificationStatus: 'failed' };
        }

        // const numberRecord = (await _.db.collection('phoneNumberVerification').doc(phoneNumber).get()).data()

        // if (numberRecord === undefined) return { verificationStatus: 'failed' }

        // const options = {
        //     method: 'POST',
        //     uri: 'https://graph.accountkit.com/v1.3/confirm_login',
        //     body: {
        //         access_token: 'AA|417220179140522|ab24de6ee332dda023036222512d544b',
        //         credentials_type: 'phone_number',
        //         locale: 'en_GB',
        //         confirmation_code: code,
        //         login_request_code: numberRecord.login_request_code,
        //         phone_number: phoneNumber,
        //         sdk: 'android',
        //         response_type: 'code'
        //     },
        //     json: true
        // }
        // res = await _.rp(options)

        // if (res.error) {
        //     return { verificationStatus: 'failed' }
        // } else {
        //     return { verificationStatus: 'successful' }
        // }
    } catch (error) {
        return { verificationStatus: 'failed' }
    }
})

/****************************************************************************************************
 * BACKGROUNG FUNCTIONS
 * 
 ****************************************************************************************************/

/**
 * Sends notification to slack channel on user creation
 */
exports.notifySlack = functions.firestore.document('users-beta/{userId}').onCreate((snap, context) => {
    const user = snap.data()
    if (user === undefined) return
    user.uid = snap.id

    const { IncomingWebhook } = require('@slack/webhook')
    //#notifs channel
    const url = 'https://hooks.slack.com/services/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';
    const webhook = new IncomingWebhook(url)

    return webhook.send({
        text: `*${user.firstName} ${user.lastName}* viens de s'inscrire ! :tada:`
    })
})

/**
 * Increments user count
 */
exports.incrementUserCount = functions.firestore.document('users-beta/{userId}').onCreate(async (snap, context) => {
    const counter = (await _.db.collection('counter-beta').doc('count').get()).data()
    if (counter === undefined) return

    await _.db.collection('counter-beta').doc('count').update({ value: counter.value + 1 })
})

/**
 * Adds invitation transactions to newly created accounts
 */
exports.addInvitationTransaction = functions.firestore.document('users-beta/{userId}').onCreate(async (snap, context) => {
    const user = snap.data()
    if (user === undefined) return

    //If user was created with a nonce
    if (user.referrer.nonce.length > 0) {
        const sender = await _.findUser({ handle: user.referrer.handle })
        if (sender === undefined) return

        const transactionQuery = await _.db.collection('users-beta').doc(sender.uid).collection('transactions').where('nonce', '==', user.referrer.nonce).get()
        if (transactionQuery.empty) {
            return
        } else {
            if (transactionQuery.docs[0].data().status !== _.TransactionStatus.ONHOLD) return
        }

        const senderTransacRef = transactionQuery.docs[0].ref
        const receiverTransacRef = snap.ref.collection('transactions').doc(transactionQuery.docs[0].id)

        const transactionRecord = {
            receiver: {
                uid: snap.id,
                handle: user.handle,
                firstName: user.firstName,
                lastName: user.lastName
            },
        }

        //Write changes to firestore
        try {
            await senderTransacRef.update(transactionRecord)

            const updatedTransaction = (await senderTransacRef.get()).data()

            if (updatedTransaction !== undefined) {
                await receiverTransacRef.set(updatedTransaction)
            }
        } catch (error) {
            console.log(error)
        }
    }
})


// exports.callVision = functions.storage.object().onFinalize(async (object) => {

//     const db = admin.database();
//     const imageRef = db.ref('Ids-check');

//     const obj = object.name;
//     const fileBucket = object.bucket; // The Storage bucket that contains the file.
//     const filePath = object.name;

//     const gcsUrl = "gs://" + fileBucket + "/" + filePath;
//     console.log('got object name: ', obj);

//     console.log('got vision url: ', gcsUrl);

//     return Promise.resolve()
//         .then(() => {
//         const visionReq = {
//             "image": {
//                 "source": {
//                     "imageUri": gcsUrl
//                 }
//             },
//             "features": [
//                 {
//                     "type": "TEXT_DETECTION"
//                 },
//                 // Other detection types here...
//             ]
//         }
//         return vision.annotate(visionReq);
//       })
//       .then(([visionData]) => {
//         console.log('got vision data: ', visionData[0]);
//         imageRef.push(visionData[0]);
//         return true//detectEntities(visionData[0]);
//       })
//       .then(() => {
//         console.log(`Parsed vision annotation and wrote to Firebase`);
//       });
//   });

/**
 * Sends 3 transactions to new users-beta from 3 robot accounts
 * 
 */


/**
 * Cron job to accept transfers for users-beta test1, test2 and test3
 * 
 */