const express = require('express');
const WebSocket = require('ws');
const { Pool } = require('pg');

module.exports = (pool) => {
  const router = express.Router();
  
  // Fonction pour vérifier/créer la table messages
  const ensureMessagesTable = async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          sender_id VARCHAR(255) NOT NULL,
          sender_name VARCHAR(255) NOT NULL,
          sender_type VARCHAR(50) NOT NULL CHECK (sender_type IN ('rh', 'employee')),
          receiver_id VARCHAR(255) NOT NULL,
          receiver_name VARCHAR(255) NOT NULL,
          receiver_type VARCHAR(50) NOT NULL CHECK (receiver_type IN ('rh', 'employee')),
          content TEXT NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Créer des index pour améliorer les performances
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, sender_type)
      `).catch(() => {});
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, receiver_type)
      `).catch(() => {});
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC)
      `).catch(() => {});
      
      console.log('✅ Table des messages vérifiée/créée');
    } catch (error) {
      console.error('❌ Erreur lors de la vérification de la table messages:', error);
    }
  };
  
  // Vérifier/créer la table au démarrage
  ensureMessagesTable();
  
  // WebSocket pour les notifications en temps réel
  const wss = new WebSocket.Server({ port: 5002 });
  const clients = new Map();

  console.log('🔌 WebSocket Server démarré sur le port 5002');

  wss.on('connection', (ws, req) => {
    console.log('🔌 Nouvelle connexion WebSocket');
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        
        if (message.type === 'register') {
          const clientKey = `${message.userType}_${message.userId}`;
          clients.set(clientKey, ws);
          console.log(`📝 Client enregistré: ${clientKey}`);
          
          // Envoyer confirmation
          ws.send(JSON.stringify({
            type: 'registered',
            clientKey: clientKey
          }));
        }
      } catch (error) {
        console.error('Erreur lors du traitement du message WebSocket:', error);
      }
    });

    ws.on('close', () => {
      // Supprimer le client de la liste
      for (const [key, client] of clients.entries()) {
        if (client === ws) {
          clients.delete(key);
          console.log(`📝 Client déconnecté: ${key}`);
          break;
        }
      }
    });
  });

  // Fonction pour envoyer une notification WebSocket
  const sendWebSocketNotification = (userType, userId, notification) => {
    const clientKey = `${userType}_${userId}`;
    const client = clients.get(clientKey);
    
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(notification));
      console.log(`📤 Notification envoyée à ${clientKey}`);
      return true;
    } else {
      console.log(`❌ Client ${clientKey} non connecté`);
      return false;
    }
  };

  // Route pour envoyer un message
  router.post('/', async (req, res) => {
    try {
      const {
        senderId,
        senderName,
        senderType,
        receiverId,
        receiverName,
        receiverType,
        content
      } = req.body;

      console.log('📨 Nouveau message reçu:', {
        senderId,
        senderName,
        senderType,
        receiverId,
        receiverName,
        receiverType,
        content: content.substring(0, 50) + '...'
      });

      // Validation des données
      if (!senderId || !senderName || !senderType || !receiverId || !receiverName || !receiverType || !content) {
        return res.status(400).json({
          success: false,
          message: 'Tous les champs sont requis'
        });
      }

      // Vérifier que la table existe
      try {
        await ensureMessagesTable();
      } catch (tableError) {
        console.error('❌ Erreur lors de la vérification de la table:', tableError);
      }

      // Insérer le message dans la base de données
      const insertQuery = `
        INSERT INTO messages (
          sender_id, sender_name, sender_type,
          receiver_id, receiver_name, receiver_type,
          content, timestamp, is_read
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, FALSE)
        RETURNING *
      `;

      let result;
      try {
        // Convertir les IDs en strings pour la compatibilité avec VARCHAR
        const senderIdStr = senderId ? senderId.toString() : '';
        const receiverIdStr = receiverId ? receiverId.toString() : '';
        
        result = await pool.query(insertQuery, [
          senderIdStr, senderName, senderType,
          receiverIdStr, receiverName, receiverType,
          content
        ]);
      } catch (queryError) {
        console.error('❌ Erreur SQL lors de l\'insertion du message:', queryError);
        console.error('❌ Détails:', queryError.message, queryError.stack);
        return res.status(200).json({
          success: false,
          message: 'Erreur lors de l\'envoi du message',
          error: queryError.message
        });
      }

      if (!result || !result.rows || result.rows.length === 0) {
        console.error('❌ Aucun message retourné après insertion');
        return res.status(200).json({
          success: false,
          message: 'Erreur lors de l\'envoi du message',
          error: 'Aucun message retourné'
        });
      }

      const newMessage = result.rows[0];
      console.log('✅ Message sauvegardé en base:', newMessage.id);

      // Envoyer une notification WebSocket au destinataire
      try {
        const notificationSent = sendWebSocketNotification(receiverType, receiverId.toString(), {
          type: 'new_message',
          message: newMessage
        });
        console.log('📤 Notification WebSocket envoyée:', notificationSent);
      } catch (wsError) {
        console.error('❌ Erreur lors de l\'envoi de la notification WebSocket:', wsError);
      }

      res.json({
        success: true,
        message: 'Message envoyé avec succès',
        data: newMessage
      });

    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi du message:', error);
      console.error('❌ Stack:', error.stack);
      // Retourner un status 200 avec une erreur plutôt qu'un 500 pour éviter de bloquer l'interface
      res.status(200).json({
        success: false,
        message: 'Erreur lors de l\'envoi du message',
        error: error.message
      });
    }
  });

  // Route pour récupérer les messages d'un utilisateur
  router.get('/:userType/:userId', async (req, res) => {
    try {
      const { userType, userId } = req.params;

      console.log(`📥 Récupération des messages pour ${userType}:${userId}`);

      // Récupérer tous les messages où l'utilisateur est expéditeur ou destinataire
      const getMessagesQuery = `
        SELECT * FROM messages 
        WHERE (sender_id = $1 AND sender_type = $2) 
           OR (receiver_id = $1 AND receiver_type = $2)
        ORDER BY timestamp DESC
        LIMIT 100
      `;

      const result = await pool.query(getMessagesQuery, [userId, userType]);
      
      // Compter les messages non lus
      const unreadCountQuery = `
        SELECT COUNT(*) as count FROM messages 
        WHERE receiver_id = $1 AND receiver_type = $2 AND is_read = FALSE
      `;

      const unreadResult = await pool.query(unreadCountQuery, [userId, userType]);

      console.log(`✅ ${result.rows.length} messages récupérés, ${unreadResult.rows[0].count} non lus`);

      res.json({
        success: true,
        messages: result.rows,
        unreadCount: parseInt(unreadResult.rows[0].count)
      });

    } catch (error) {
      console.error('❌ Erreur lors de la récupération des messages:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des messages',
        error: error.message
      });
    }
  });

  // Route pour récupérer la conversation entre deux utilisateurs
  router.get('/conversation/:userType1/:userId1/:userType2/:userId2', async (req, res) => {
    try {
      const { userType1, userId1, userType2, userId2 } = req.params;

      console.log(`💬 Récupération conversation entre ${userType1}:${userId1} et ${userType2}:${userId2}`);

      // Vérifier que la table existe
      try {
        await ensureMessagesTable();
      } catch (tableError) {
        console.error('❌ Erreur lors de la vérification de la table:', tableError);
      }

      // Si userId1 est un email pour RH, essayer de trouver l'ID correspondant
      let actualUserId1 = userId1;
      if (userType1 === 'rh' && userId1.includes('@')) {
        try {
          const userQuery = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [userId1]
          );
          if (userQuery.rows.length > 0) {
            actualUserId1 = userQuery.rows[0].id.toString();
          }
        } catch (err) {
          // Continuer avec l'email si la recherche échoue
          console.error('❌ Erreur lors de la recherche de l\'utilisateur:', err);
        }
      }

      const conversationQuery = `
        SELECT * FROM messages 
        WHERE ((sender_id = $1 AND sender_type = $2 AND receiver_id = $3 AND receiver_type = $4)
            OR (sender_id = $3 AND sender_type = $4 AND receiver_id = $1 AND receiver_type = $2))
        ORDER BY timestamp ASC
      `;

      let result;
      try {
        result = await pool.query(conversationQuery, [actualUserId1, userType1, userId2, userType2]);
      } catch (queryError) {
        console.error('❌ Erreur SQL lors de la récupération de la conversation:', queryError);
        return res.status(200).json({
          success: true,
          conversation: [],
          error: queryError.message
        });
      }

      console.log(`✅ ${result.rows.length} messages dans la conversation`);

      res.json({
        success: true,
        conversation: result.rows || []
      });

    } catch (error) {
      console.error('❌ Erreur lors de la récupération de la conversation:', error);
      console.error('❌ Stack:', error.stack);
      // Retourner une réponse 200 avec une conversation vide plutôt qu'une erreur 500
      res.status(200).json({
        success: true,
        conversation: [],
        error: error.message
      });
    }
  });

  // Route pour marquer des messages comme lus (par IDs)
  router.post('/mark-read', async (req, res) => {
    try {
      const { messageIds } = req.body;

      if (!messageIds || !Array.isArray(messageIds)) {
        return res.status(400).json({
          success: false,
          message: 'IDs des messages requis'
        });
      }

      console.log(`📖 Marquage de ${messageIds.length} messages comme lus`);

      // Marquer les messages comme lus
      const updateQuery = `
        UPDATE messages 
        SET is_read = TRUE 
        WHERE id = ANY($1)
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [messageIds]);

      console.log(`✅ ${result.rowCount} messages marqués comme lus`);

      res.json({
        success: true,
        message: 'Messages marqués comme lus',
        updatedCount: result.rowCount
      });

    } catch (error) {
      console.error('❌ Erreur lors du marquage des messages:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du marquage des messages',
        error: error.message
      });
    }
  });

  // Route pour marquer des messages comme lus (par conversation)
  router.post('/mark-read-conversation', async (req, res) => {
    try {
      const { senderId, senderType, receiverId, receiverType } = req.body;

      if (!senderId || !senderType || !receiverId || !receiverType) {
        return res.status(400).json({
          success: false,
          message: 'Paramètres de conversation requis'
        });
      }

      console.log(`📖 Marquage des messages de la conversation ${senderType}:${senderId} -> ${receiverType}:${receiverId}`);

      // Marquer les messages de cette conversation comme lus
      const updateQuery = `
        UPDATE messages 
        SET is_read = TRUE 
        WHERE sender_id = $1 AND sender_type = $2 
          AND receiver_id = $3 AND receiver_type = $4
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [senderId, senderType, receiverId, receiverType]);

      console.log(`✅ ${result.rowCount} messages marqués comme lus`);

      res.json({
        success: true,
        message: 'Messages de conversation marqués comme lus',
        updatedCount: result.rowCount
      });

    } catch (error) {
      console.error('❌ Erreur lors du marquage des messages:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du marquage des messages',
        error: error.message
      });
    }
  });

  // Route pour récupérer les statistiques de messagerie
  router.get('/stats/:userType/:userId', async (req, res) => {
    try {
      const { userType, userId } = req.params;

      console.log(`📊 Récupération des statistiques pour ${userType}:${userId}`);

      // Si userId est un email, on doit trouver l'ID correspondant dans la table users
      let actualUserId = userId;
      
      // Vérifier si userId est un email (contient @)
      if (userId.includes('@')) {
        try {
          const userQuery = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [userId]
          );
          
          if (userQuery.rows.length > 0) {
            actualUserId = userQuery.rows[0].id.toString();
            console.log(`📧 Email ${userId} correspond à l'ID utilisateur ${actualUserId}`);
          } else {
            // Si l'utilisateur n'existe pas dans la table users, retourner des statistiques vides
            console.log(`⚠️ Aucun utilisateur trouvé pour l'email ${userId}`);
            return res.status(200).json({
              success: true,
              stats: {
                total_messages: 0,
                sent_messages: 0,
                received_messages: 0,
                unread_messages: 0
              },
              recentActivity: []
            });
          }
        } catch (userError) {
          console.error('❌ Erreur lors de la recherche de l\'utilisateur:', userError);
          // En cas d'erreur, retourner des statistiques vides
          return res.status(200).json({
            success: true,
            stats: {
              total_messages: 0,
              sent_messages: 0,
              received_messages: 0,
              unread_messages: 0
            },
            recentActivity: []
          });
        }
      }

      // Convertir actualUserId en entier pour la requête SQL
      const userIdInt = parseInt(actualUserId);
      if (isNaN(userIdInt)) {
        console.log(`⚠️ Impossible de convertir ${actualUserId} en entier`);
        return res.status(200).json({
          success: true,
          stats: {
            total_messages: 0,
            sent_messages: 0,
            received_messages: 0,
            unread_messages: 0
          },
          recentActivity: []
        });
      }

      // Statistiques générales
      const statsQuery = `
        SELECT 
          COUNT(*) as total_messages,
          COUNT(CASE WHEN sender_id = $1 AND sender_type = $2 THEN 1 END) as sent_messages,
          COUNT(CASE WHEN receiver_id = $1 AND receiver_type = $2 THEN 1 END) as received_messages,
          COUNT(CASE WHEN receiver_id = $1 AND receiver_type = $2 AND is_read = FALSE THEN 1 END) as unread_messages
        FROM messages 
        WHERE sender_id = $1 AND sender_type = $2 
           OR receiver_id = $1 AND receiver_type = $2
      `;

      const result = await pool.query(statsQuery, [userIdInt, userType]);

      // Messages récents (derniers 7 jours)
      const recentQuery = `
        SELECT DATE(timestamp) as date, COUNT(*) as count
        FROM messages 
        WHERE (sender_id = $1 AND sender_type = $2) 
           OR (receiver_id = $1 AND receiver_type = $2)
        AND timestamp >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `;

      const recentResult = await pool.query(recentQuery, [userIdInt, userType]);

      console.log(`✅ Statistiques récupérées: ${result.rows[0].total_messages} messages totaux`);

      res.json({
        success: true,
        stats: result.rows[0],
        recentActivity: recentResult.rows
      });

    } catch (error) {
      console.error('❌ Erreur lors de la récupération des statistiques:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques',
        error: error.message
      });
    }
  });

  // Route pour supprimer un message
  router.delete('/:messageId', async (req, res) => {
    try {
      const { messageId } = req.params;

      console.log(`🗑️ Suppression du message ${messageId}`);

      const deleteQuery = 'DELETE FROM messages WHERE id = $1 RETURNING *';
      const result = await pool.query(deleteQuery, [messageId]);

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Message non trouvé'
        });
      }

      console.log(`✅ Message ${messageId} supprimé`);

      res.json({
        success: true,
        message: 'Message supprimé avec succès'
      });

    } catch (error) {
      console.error('❌ Erreur lors de la suppression du message:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression du message',
        error: error.message
      });
    }
  });

  // Route spéciale pour les statistiques RH (compteurs par employé)
  router.get('/stats/rh/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      console.log(`📊 Récupération des statistiques RH pour ${userId}`);

      // Si userId est un email, on doit trouver l'ID correspondant dans la table users
      // Sinon, on utilise directement userId comme ID
      let actualUserId = userId;
      
      // Vérifier si userId est un email (contient @)
      if (userId.includes('@')) {
        try {
          const userQuery = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [userId]
          );
          
          if (userQuery.rows.length > 0) {
            actualUserId = userQuery.rows[0].id;
            console.log(`📧 Email ${userId} correspond à l'ID utilisateur ${actualUserId}`);
          } else {
            // Si l'utilisateur n'existe pas dans la table users, retourner 0 messages
            console.log(`⚠️ Aucun utilisateur trouvé pour l'email ${userId}`);
            return res.status(200).json({
              success: true,
              unreadCounts: {},
              totalUnread: 0
            });
          }
        } catch (userError) {
          console.error('❌ Erreur lors de la recherche de l\'utilisateur:', userError);
          // En cas d'erreur, essayer de continuer avec l'email comme ID
          actualUserId = userId;
        }
      }

      // Vérifier que la table existe d'abord (ne pas laisser cette fonction lancer une erreur non capturée)
      try {
        await ensureMessagesTable();
      } catch (tableError) {
        console.error('❌ Erreur lors de la vérification de la table messages:', tableError);
        // Continuer quand même, la requête échouera mais sera capturée
      }

      // Compteurs de messages non lus par employé pour RH
      // Utiliser receiver_name ou receiver_id selon ce qui est disponible
      let unreadCountsQuery;
      let queryParams;
      
      // Si actualUserId est un nombre (ID), utiliser receiver_id
      // Sinon, utiliser receiver_name (email)
      if (typeof actualUserId === 'number' || /^\d+$/.test(actualUserId.toString())) {
        unreadCountsQuery = `
          SELECT 
            sender_id as employee_id,
            sender_name as employee_name,
            COUNT(*) as unread_count
          FROM messages 
          WHERE receiver_id = $1
            AND receiver_type = 'rh'
            AND is_read = FALSE
          GROUP BY sender_id, sender_name
          ORDER BY unread_count DESC
        `;
        queryParams = [actualUserId.toString()];
      } else {
        // Si c'est un email, utiliser receiver_name
        unreadCountsQuery = `
          SELECT 
            sender_id as employee_id,
            sender_name as employee_name,
            COUNT(*) as unread_count
          FROM messages 
          WHERE receiver_name = $1
            AND receiver_type = 'rh'
            AND is_read = FALSE
          GROUP BY sender_id, sender_name
          ORDER BY unread_count DESC
        `;
        queryParams = [actualUserId];
      }

      console.log(`🔍 Exécution de la requête avec params:`, queryParams);
      console.log(`🔍 Requête SQL:`, unreadCountsQuery);

      let result;
      try {
        result = await pool.query(unreadCountsQuery, queryParams);
      } catch (queryError) {
        console.error('❌ Erreur SQL lors de l\'exécution de la requête:', queryError);
        console.error('❌ Message SQL:', queryError.message);
        // Si la table n'existe pas ou autre erreur SQL, retourner une réponse vide
        return res.json({
          success: true,
          unreadCounts: {},
          totalUnread: 0,
          error: queryError.message
        });
      }

      // Convertir en objet pour faciliter l'utilisation côté frontend
      const unreadCounts = {};
      if (result && result.rows) {
        result.rows.forEach(row => {
          unreadCounts[row.employee_id] = {
            name: row.employee_name,
            count: parseInt(row.unread_count)
          };
        });
      }

      const totalUnread = Object.values(unreadCounts).reduce((sum, emp) => sum + emp.count, 0);
      console.log(`✅ Statistiques RH récupérées: ${Object.keys(unreadCounts).length} employés avec messages non lus, total: ${totalUnread}`);

      res.json({
        success: true,
        unreadCounts: unreadCounts,
        totalUnread: totalUnread
      });

    } catch (error) {
      console.error('❌ Erreur lors de la récupération des statistiques RH:', error);
      console.error('❌ Message d\'erreur:', error.message);
      console.error('❌ Stack trace:', error.stack);
      
      // Retourner une réponse 200 avec des valeurs vides plutôt qu'une erreur 500 pour éviter de bloquer l'interface
      // Ne pas utiliser res.status(500) pour cette route
      return res.status(200).json({
        success: true,
        unreadCounts: {},
        totalUnread: 0,
        error: error.message
      });
    }
  });

  // Route spéciale pour les statistiques employé
  router.get('/stats/employee/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      console.log(`📊 Récupération des statistiques employé pour ${userId}`);

      // Compteur de messages non lus pour l'employé
      const unreadCountQuery = `
        SELECT COUNT(*) as unread_count
        FROM messages 
        WHERE receiver_id = $1 
          AND receiver_type = 'employee'
          AND is_read = FALSE
      `;

      const result = await pool.query(unreadCountQuery, [userId]);
      const unreadCount = parseInt(result.rows[0].unread_count);

      console.log(`✅ Statistiques employé récupérées: ${unreadCount} messages non lus`);

      res.json({
        success: true,
        unreadCount: unreadCount
      });

    } catch (error) {
      console.error('❌ Erreur lors de la récupération des statistiques employé:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques employé',
        error: error.message
      });
    }
  });

  return router;
};
