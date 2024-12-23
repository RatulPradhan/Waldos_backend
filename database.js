import mysql from "mysql2";
import dotenv from "dotenv";
import e from "express";
import { format } from "date-fns";

dotenv.config();

const db = mysql
	.createPool({
		host: process.env.DB_HOST,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
	})
	.promise();

//notifications

export const getPostFromLike = async (commentId) => {
	const query = `SELECT post_id FROM comment WHERE comment_id = ?`;
	const [rows] = await db.execute(query, [commentId]);
	return rows[0]?.post_id || null;
};

export const getPostOwner = async (postId) => {
	const query = `SELECT user_id FROM post WHERE post_id = ?`;
	const [rows] = await db.execute(query, [postId]);
	return rows[0]?.user_id || null;
};

export const getCommentOwner = async (commentId) => {
	const query = `SELECT user_id FROM comment WHERE comment_id = ?`;
	const [rows] = await db.execute(query, [commentId]);
	return rows[0]?.user_id || null;
};

export const addNotification = async (
	userId,
	senderId,
	postId,
	commentId,
	type
) => {
	const query = `
        INSERT INTO notifications (user_id, sender_id, post_id, comment_id, type)
        VALUES (?, ?, ?, ?, ?)
    `;
	await db.execute(query, [userId, senderId, postId, commentId, type]);
};

export const getNotification = async (userId) => {
	const query = `SELECT n.*, u.username AS sender_name
                   FROM notifications n
                   JOIN user u ON n.sender_id = u.user_id
                   WHERE n.user_id = ? ORDER BY n.created_at DESC`;
	return await db.execute(query, [userId]);
};

export async function markNotificationAsRead(notificationId) {
	try {
		const query = "UPDATE notifications SET is_read = TRUE WHERE id = ?";
		await db.query(query, [notificationId]);
	} catch (error) {
		console.error("Error marking notification as read:", error);
		throw new Error("Database error: Could not mark notification as read");
	}
}

export async function getUsers() {
	const [rows] = await db.query("SELECT * FROM user;");
	return rows;
}

export async function getUnbannedUsers() {
	const [rows] = await db.query(`
    SELECT * 
    FROM user
    WHERE email NOT IN (SELECT email FROM banned_users);
  `);
	return rows;
}

export async function getBannedUserEmails() {
	const [rows] = await db.query("SELECT email FROM banned_users;");
	return rows;
}

export async function getAllReports() {
	const [report] = await db.query("SELECT * FROM reports;");
	const [c_report] = await db.query("SELECT * FROM reportComment;");

	// Combine the dictionaries by their index positions
	const combinedReports = report.map((item, index) => {
		return { ...item, ...(c_report[index] || {}) };
	});

	return combinedReports;
}

export async function removeUserFromBanList(email) {
	const query = `DELETE FROM banned_users WHERE email = ?`;
	try {
		const result = await db.execute(query, [email]);
		return result;
	} catch (error) {
		console.error("Error removing user from ban list:", error);
		throw new Error("Database error: Could not remove user from ban list");
	}
}

//logged in user
export async function getUserByID(id) {
	const [rows] = await db.query(`SELECT * FROM user WHERE user_id = ?`, [id]);
	return rows;
}

// fetch other user
// export async function getUserProfileById(user_id) {
// 	const query = `
// 	  SELECT u.username,
// 	  		 u.user_id,
// 			 u.profile_picture,
// 			 u.Bio,
// 			 u.created_at,
// 			 u.user_type,
// 			 p.post_id,
// 			 p.title,
// 			 p.content,
// 			 p.created_at AS post_created_at
// 	  FROM user u
// 	  LEFT JOIN post p ON u.user_id = p.user_id
// 	  WHERE u.user_id = ?
// 	`;

// 	const [rows] = await db.query(query, [user_id]);

// 	if (!rows.length) {
// 	  return null; // No user found
// 	}

// 	// Format the user profile and posts
// 	return {
// 	  username: rows[0].username,
// 	  userRole: rows[0].user_type,
// 	  user_id: rows[0].user_id,
// 	  profile_picture: rows[0].profile_picture,
// 	  bio: rows[0].Bio,
// 	  created_at: rows[0].created_at,
// 	  posts: rows
// 		.filter((row) => row.post_id) // Filter rows with posts
// 		.map((post) => ({
// 		  post_id: post.post_id,
// 		  title: post.title,
// 		  content: post.content,
// 		  created_at: post.post_created_at,
// 		})),
// 	};
// }

export async function getUserProfileById(user_id) {
	const query = `
	  SELECT 
	    u.username AS profile_username, 
	    u.user_id,
	    u.profile_picture, 
	    u.Bio, 
	    u.created_at, 
	    u.user_type,
	    p.post_id, 
	    p.title, 
	    p.content, 
	    p.created_at AS post_created_at, 
		p.photo_id,
	    post_user.username AS post_author_username,
	    COUNT(c.comment_id) AS comment_count
	  FROM user u
	  LEFT JOIN post p ON u.user_id = p.user_id
	  LEFT JOIN user post_user ON p.user_id = post_user.user_id
	  LEFT JOIN comment c ON p.post_id = c.post_id
	  WHERE u.user_id = ?
	  GROUP BY p.post_id, u.user_id, post_user.username
	`;

	const [rows] = await db.query(query, [user_id]);

	if (!rows.length) {
		return null; // No user found
	}

	// Format the user profile and posts
	return {
		username: rows[0].profile_username, // User's profile username
		userRole: rows[0].user_type,
		user_id: rows[0].user_id,
		profile_picture: rows[0].profile_picture,
		bio: rows[0].Bio,
		created_at: rows[0].created_at,
		posts: rows
			.filter((row) => row.post_id) // Filter rows with posts
			.map((post) => ({
				post_id: post.post_id,
				title: post.title,
				content: post.content,
				created_at: post.post_created_at,
				username: post.post_author_username, // Author username
				comment_count: post.comment_count || 0, // Number of comments
				profile_picture: rows[0].profile_picture,
				photo_id: post.photo_id,
			})),
	};
}

export async function getUser(username) {
	const [rows] = await db.query(`SELECT * FROM user WHERE username = ?`, [
		username,
	]);
	return rows;
}

export async function banUser(email) {
	const result = await db.query(
		`
    INSERT INTO banned_users (email)
    VALUES (?)
    `,
		[email]
	);
	const rEmail = result.email;
	return getUser(rEmail);
}

export async function getPasswordByEmail(email) {
	const [rows] = await db.query(`SELECT password FROM user where email = ?`, [
		email,
	]);
	return rows;
}

export async function getUserByEmail(email) {
	const [rows] = await db.query(`SELECT * FROM user WHERE email = ?`, [email]);
	return rows;
}
// change in userData
// export async function getUserByEmail(email) {
// 	const query = `
// 	  SELECT u.*,
// 			 p.post_id, p.title, p.content, p.created_at AS post_created_at
// 	  FROM user u
// 	  LEFT JOIN post p ON u.user_id = p.user_id
// 	  WHERE u.email = ?
// 	`;

// 	const [rows] = await db.query(query, [email]);

// 	return rows;

// 	// if (!rows.length) {
// 	//   return null; // Return null if no user is found
// 	// }

// 	// const user = {
// 	//   ...rows[0], // Spread user details
// 	//   posts: rows
// 	// 	.filter((row) => row.post_id) // Filter rows with posts
// 	// 	.map((post) => ({
// 	// 	  post_id: post.post_id,
// 	// 	  title: post.title,
// 	// 	  content: post.content,
// 	// 	  created_at: post.post_created_at,
// 	// 	})),
// 	// };
// }

export async function createUser(
	username,
	email,
	password,
	type,
	Bio,
	profile_picture
) {
	const result = await db.query(
		`
    
    INSERT INTO user (username, email, password, user_type, Bio, profile_picture)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
		[username, email, password, type, Bio, profile_picture]
	);
	const id = result.user_id;
	return getUser(id);
}

export async function getEvents() {
	const [rows] = await db.query("SELECT * FROM event;");
	return rows;
}

export async function getOngoingUpcomingEvents() {
	const [rows] = await db.query(
		"SELECT * FROM event WHERE status = 'ongoing' OR status = 'upcoming';"
	);
	return rows;
}

// Helper function to format the datetime for MySQL
function formatDateForMySQL(date) {
	return format(new Date(date), "yyyy-MM-dd HH:mm:ss");
}

// In your `createEvent` function or wherever you call it
export async function createEvent(name, url, status, event_at, event_end_at) {
	// Format the event_at datetime for MySQL
	console.log(event_at);
	console.log(event_end_at);
	const formattedEventAt = formatDateForMySQL(event_at);
	const formattedEventEndAt = formatDateForMySQL(event_end_at);

	const query = `INSERT INTO event (name, url, status, event_at, event_end_at) VALUES (?, ?, ?, ?, ?)`;

	try {
		const [result] = await db.execute(query, [
			name,
			url,
			status,
			formattedEventAt, // Use the formatted datetime
			formattedEventEndAt,
		]);
		const id = result.insertId;
		return getPost(id);
	} catch (error) {
		console.error("Error saving post:", error);
		throw new Error("Database error: Could not save post");
	}
}

export async function createPost(
	user_id,
	channel_id,
	title,
	content,
	photo_id
) {
	const query = `INSERT INTO post (user_id, channel_id, title, content, photo_id) VALUES (?, ?, ?, ?, ?)`;

	// Convert undefined to null
	const params = [
		user_id !== undefined ? user_id : null,
		channel_id !== undefined ? channel_id : null,
		title !== undefined ? title : null,
		content !== undefined ? content : null,
		photo_id !== undefined ? photo_id : null,
	];

	console.log("CHECKING Parameters:", params);

	try {
		const [result] = await db.execute(query, params);
		const id = result.insertId;
		return getPost(id);
	} catch (error) {
		console.error("Error saving post:", error);
		throw new Error("Database error: Could not save post");
	}
}

export async function updatePostPhoto(postId, photoId) {
	const query = `UPDATE post SET photo_id = ? WHERE post_id = ?`;

	try {
		const result = await db.execute(query, [photoId, postId]);
		return result;
	} catch (error) {
		console.error("Error updating post photo:", error);
		throw new Error("Database error: Could not update post photo");
	}
}

export async function getPost(id) {
	const [rows] = await db.query(
		`
      SELECT * 
      FROM post
      WHERE post_id = ?`,
		[id]
	);

	return rows[0];
}

export async function getPostsByChannel(channel_id) {
	const [rows] = await db.query(`SELECT * FROM post WHERE channel_id = ?`, [
		channel_id,
	]);
	return rows[0];
}

export async function getAllPosts() {
	const query = `SELECT post.*, user.username, user.profile_picture,
		(SELECT COUNT(*) FROM comment WHERE comment.post_id = post.post_id) AS comment_count
		FROM post
		JOIN user ON post.user_id = user.user_id
		ORDER BY post.created_at DESC`;

	try {
		const [rows] = await db.execute(query);
		return rows;
	} catch (error) {
		console.error("Error retrieving posts:", error);
		throw new Error("Database error: Could not retrieve posts");
	}
}

//delete post
export async function deletePost(post_id) {
	const query = "DELETE FROM post WHERE post_id = ?";

	return db.execute(query, [post_id]);
}

//update post
export async function updatePost(post_id, title, content) {
	const query = "UPDATE post SET title = ?, content = ? WHERE post_id = ?";
	return db.execute(query, [title, content, post_id]);
}

// comment's function

export async function createComment(postId, userId, content, parent_id = null) {
	const query = `INSERT INTO comment (post_id, user_id, content, parent_id)
                 VALUES (?, ?, ?, ?)`;
	try {
		const [result] = await db.execute(query, [
			postId,
			userId,
			content,
			parent_id,
		]);
		const id = result.insertId;
		return getComment(id);
	} catch (error) {
		console.error("Error saving comment:", error);
		throw new Error("Database error: Could not save comment");
	}
}

export async function getComment(id) {
	const [rows] = await db.query(
		`SELECT comment.*, user.username, user.profile_picture
		FROM comment
		JOIN user ON comment.user_id = user.user_id
		WHERE comment.comment_id = ?`,
		[id]
	);

	return rows[0];
}

export async function getPostWithComments(post_id) {
	const postQuery = ` 
	SELECT post.*, user.username, user.profile_picture,
	(SELECT COUNT(*) FROM comment WHERE comment.post_id = post.post_id) AS comment_count
	FROM post
	JOIN user ON post.user_id = user.user_id
	WHERE post.post_id = ?`;

	const commentsQuery = `
	SELECT comment.*, user.username, user.profile_picture
	FROM comment
	JOIN user ON comment.user_id = user.user_id
	WHERE comment.post_id = ?
	ORDER BY comment.created_at ASC
  `;

	try {
		const [postResult] = await db.execute(postQuery, [post_id]);
		const [commentsResult] = await db.execute(commentsQuery, [post_id]);

		if (!postResult.length) {
			throw new Error(`Post with id ${post_id} not found`);
		}

		const post = postResult[0];

		const commentsByParentId = commentsResult.reduce((acc, comment) => {
			const parentId = comment.parent_id || null;
			if (!acc[parentId]) {
				acc[parentId] = [];
			}
			acc[parentId].push(comment);
			return acc;
		}, {});

		// Recursive function to nest replies
		const nestReplies = (commentList) => {
			return commentList.map((comment) => ({
				...comment,
				replies: commentsByParentId[comment.comment_id]
					? nestReplies(commentsByParentId[comment.comment_id])
					: [],
			}));
		};

		// Initialize top-level comments with nested replies
		const topLevelComments = nestReplies(commentsByParentId[null] || []);

		// const topLevelComments = commentsByParentId[null] || [];

		// topLevelComments.forEach((comment) => {
		// 	comment.replies = commentsByParentId[comment.comment_id] || [];
		// });

		// num of total comments
		const totalComments = commentsResult.length;

		return { post, comments: topLevelComments, totalComments };
	} catch (error) {
		console.error("Error retrieving post and comments:", error);
		throw new Error("Database error: Could not retrieve post and comments");
	}
}

//update comment
export async function updateComment(comment_id, content) {
	const query = "UPDATE comment SET content = ? WHERE comment_id = ?";
	return db.execute(query, [content, comment_id]);
}

//function to filter channel
export async function getCeramicPost() {
	const query = `SELECT post.*, user.username, user.profile_picture,
		(SELECT COUNT(*) FROM comment WHERE comment.post_id = post.post_id) AS comment_count
		FROM post
		JOIN user ON post.user_id = user.user_id
		WHERE post.channel_id = 2
		ORDER BY post.created_at DESC`;
	const [rows] = await db.execute(query);
	return rows;
}

export async function getPrintmakingPost() {
	const query = `SELECT post.*, user.username, user.profile_picture,
		(SELECT COUNT(*) FROM comment WHERE comment.post_id = post.post_id) AS comment_count
		FROM post
		JOIN user ON post.user_id = user.user_id
		WHERE post.channel_id = 3
		ORDER BY post.created_at DESC`;

	const [rows] = await db.execute(query);
	return rows;
}

export async function getFilmPost() {
	const query = `SELECT post.*, user.username,user.profile_picture,
		(SELECT COUNT(*) FROM comment WHERE comment.post_id = post.post_id) AS comment_count
		FROM post
		JOIN user ON post.user_id = user.user_id
		WHERE post.channel_id = 4
		ORDER BY post.created_at DESC`;

	const [rows] = await db.execute(query);
	return rows;
}

// function to add report(post)
export async function addReport(postId, reportedBy, reason) {
	const query =
		"INSERT INTO reports (post_id, reported_by, reason, status) VALUES (?, ?, ?, ?)";
	const params = [postId, reportedBy, reason, "pending"];
	return db.execute(query, params);
}

// function to add report(comment)
export async function addReportComment(commentId, reportedBy, reason) {
	const query =
		"INSERT INTO reportComment (comment_id, reported_by, reason, status) VALUES (?, ?, ?, ?)";
	const params = [commentId, reportedBy, reason, "pending"];
	return db.execute(query, params);
}

// Function to add a like to a post
export async function likePost(post_id, user_id) {
	const [exists] = await db.query(
		"SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?",
		[post_id, user_id]
	);
	if (exists.length === 0) {
		await db.query("INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)", [
			post_id,
			user_id,
		]);
	}
	const [result] = await db.query(
		"SELECT COUNT(*) AS like_count FROM post_likes WHERE post_id = ?",
		[post_id]
	);
	return result[0].like_count;
}

// Function to add a like to a comment
export async function likeComment(comment_id, user_id) {
	const [exists] = await db.query(
		"SELECT * FROM comment_likes WHERE comment_id = ? AND user_id = ?",
		[comment_id, user_id]
	);
	if (exists.length === 0) {
		await db.query(
			"INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)",
			[comment_id, user_id]
		);
	}
	const [result] = await db.query(
		"SELECT COUNT(*) AS like_count FROM comment_likes WHERE comment_id = ?",
		[comment_id]
	);
	return result[0].like_count;
}

// Function to get users who liked a post
export async function getPostLikes(post_id) {
	const likeCountQuery =
		"SELECT COUNT(*) AS like_count FROM post_likes WHERE post_id = ?";
	const likedUsersQuery = `
      SELECT user.user_id, user.username, user.profile_picture
      FROM post_likes
      JOIN user ON post_likes.user_id = user.user_id
      WHERE post_likes.post_id = ?
    `;

	const [likeCountResult] = await db.execute(likeCountQuery, [post_id]);
	const [likedUsersResult] = await db.execute(likedUsersQuery, [post_id]);

	return {
		like_count: likeCountResult[0].like_count,
		liked_by_users: likedUsersResult,
	};
}

// Function to get users who liked a comment
export async function getCommentLikes(comment_id) {
	const likeCountQuery =
		"SELECT COUNT(*) AS like_count FROM comment_likes WHERE comment_id = ?";
	const likedUsersQuery = `
      SELECT user.user_id, user.username, user.profile_picture
      FROM comment_likes
      JOIN user ON comment_likes.user_id = user.user_id
      WHERE comment_likes.comment_id = ?
    `;

	const [likeCountResult] = await db.execute(likeCountQuery, [comment_id]);
	const [likedUsersResult] = await db.execute(likedUsersQuery, [comment_id]);

	return {
		like_count: likeCountResult[0].like_count,
		liked_by_users: likedUsersResult,
	};
}

//delete like from post
export async function removeLikeFromPost(postId, userId) {
	const query = `
        DELETE FROM post_likes
        WHERE post_id = ? AND user_id = ?;
    `;
	return db.execute(query, [postId, userId]);
}

//delete like from comment
export async function removeLikeFromComment(commentId, userId) {
	const query = `
        DELETE FROM comment_likes
        WHERE comment_id = ? AND user_id = ?;
    `;
	return db.execute(query, [commentId, userId]);
}

// Function to test getUsers
async function testGetUsers() {
	try {
		const users = await getUsers();
		console.log(users);
	} catch (error) {
		console.error("Error fetching users:", error);
	}
}

export async function followChannel(user_id, channel_id) {
	const result = await db.query(
		`
		INSERT INTO following (user_id, channel_id)
		VALUES (?, ?)
		`,
		[user_id, channel_id]
	);

	// Return confirmation or the inserted row
	return {
		message: "User followed the channel successfully",
		user_id,
		channel_id,
	};
}

export async function getFollowingIds(channel_id) {
	try {
		// Query to get user IDs from the 'following' table
		const [userIdsResult] = await pool.execute(
			"SELECT user_id FROM following WHERE channel_id = ?",
			[channel_id]
		);

		// Extract user IDs into an array
		const userIds = userIdsResult.map((row) => row.user_id);
		return userIds;
	} catch (error) {
		console.error("Error fetching following IDs:", error);
		throw error;
	}
}

export async function getUserEmailById(user_id) {
	try {
		// Query to get the user's email from the 'users' table
		const [result] = await pool.execute(
			"SELECT email FROM users WHERE user_id = ?",
			[user_id]
		);

		// If a result is found, return the email
		if (result.length > 0) {
			return result[0].email;
		}

		// If no result is found, return null
		return null;
	} catch (error) {
		console.error("Error fetching user email:", error);
		throw error;
	}
}

export async function unfollowChannel(user_id, channel_id) {
	const result = await db.query(
		`
    DELETE FROM following
    WHERE user_id = ? AND channel_id = ?
    `,
		[user_id, channel_id]
	);

	// Return the number of affected rows or a message for confirmation
	return result.affectedRows > 0
		? { message: "User successfully unfollowed the channel" }
		: { message: "No matching record found" };
}

export async function isFollowing(user_id, channel_id) {
	try {
		const result = await db.query(
			`
      SELECT 1 
      FROM following
      WHERE user_id = ? AND channel_id = ?
      LIMIT 1
      `,
			[user_id, channel_id]
		);

		// If the result has any rows, return true, otherwise false
		return result[0].length > 0;
	} catch (error) {
		console.error("Error checking if user is following the channel:", error);
		throw error; // Propagate the error for upstream handling
	}
}

//function to insert data into a database
//takes in a list of values and a query string
//returns the result of the query
export async function insertData(values, query) {
	try {
		const result = await db.query(query, values);
		return result;
	} catch (error) {
		console.error("Error inserting data:", error);
	}
}

export async function getUserBio(userId) {
	const query = `SELECT bio FROM user WHERE user_id = ?`;
	const [rows] = await db.execute(query, [userId]);
	return rows[0];
}

export async function getUserCreated_at(userId) {
	const query = `SELECT created_at FROM user WHERE user_id = ?`;
	const [rows] = await db.execute(query, [userId]);
	return rows[0];
}

export async function updateUserProfilePicture(userId, fileExtension) {
	const query = `UPDATE user SET profile_picture = ? WHERE user_id = ?`;
	try {
		const [result] = await db.execute(query, [fileExtension, userId]);
		return result;
	} catch (error) {
		console.error("Error updating user profile picture:", error);
		throw new Error("Database error: Could not update user profile picture");
	}
}

export async function updateBio(userId, bio) {
	const query = `UPDATE user SET bio = ? WHERE user_id = ?`;
	try {
		const [result] = await db.execute(query, [bio, userId]);
		return result;
	} catch (error) {
		console.error("Error updating user bio:", error);
		throw new Error("Database error: Could not update user bio");
	}
}

export async function updateUsername(userId, newUsername) {
	const checkQuery = `SELECT COUNT(*) as count FROM user WHERE username = ?`;
	const updateQuery = `UPDATE user SET username = ? WHERE user_id = ?`;

	try {
		const [checkResult] = await db.execute(checkQuery, [newUsername]);
		if (checkResult[0].count > 0) {
			throw new Error("Username is already taken");
		}

		const [updateResult] = await db.execute(updateQuery, [newUsername, userId]);
		return updateResult;
	} catch (error) {
		console.error("Error updating username:", error);
		throw new Error("Database error: Could not update username");
	}
}
