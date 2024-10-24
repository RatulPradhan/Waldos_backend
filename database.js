import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

export async function getPasswordByEmail(email) {
	const [rows] = await db.query(`SELECT password FROM user where email = ?`, [
		email,
	]);
	return rows;
}

const db = mysql
	.createPool({
		host: process.env.DB_HOST,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
	})
	.promise();

export async function getUsers() {
	const [rows] = await db.query("SELECT * FROM user;");
	return rows;
}

export async function getUserByID(id) {
	const [rows] = await db.query(`SELECT * FROM user WHERE user_id = ?`, [id]);
	return rows;
}

export async function getUser(username) {
	const [rows] = await db.query(`SELECT * FROM user WHERE username = ?`, [
		username,
	]);
	return rows;
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

export async function createUser(username, email, password, type) {
	const result = await db.query(
		`
    
    INSERT INTO user (username, email, password, user_type)
    VALUES (?, ?, ?, ?)
    `,
		[username, email, password, type]
	);
	const id = result.user_id;
	return getUser(id);
}

// post's functions
export async function createPost(user_id, channel_id, title, content) {
	// testing code
	// console.log("user_id:", user_id);
  	// console.log("channel_id:", channel_id);
  	// console.log("title:", title);
  	// console.log("content:", content);
	const query = `INSERT INTO post (user_id, channel_id, title, content) VALUES (?, ?, ?, ?)`;

	try {
		const [result] = await db.execute(query, [
			user_id,
			channel_id,
			title,
			content,
		]);
		const id = result.insertId;
		return getPost(id);
	} catch (error) {
		console.error("Error saving post:", error);
		throw new Error("Database error: Could not save post");
	}
}

export async function getPost(id) {
	const [rows] = await db.query(
		`
      SELECT * 
      FROM post
      WHERE post_id = ?
  `,
		[id]
	);

	return rows[0];
}

export async function getAllPosts() {
	const query = `SELECT post.post_id, post.user_id, post.channel_id, post.title, post.content, post.created_at, user.username,
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
		`
      SELECT * 
      FROM comment
      WHERE comment_id = ?
  `,
		[id]
	);

	return rows[0];
}

export async function getPostWithComments(post_id) {
	const postQuery = `SELECT * FROM post WHERE post_id = ?`;

	const commentsQuery = `
	SELECT comment.comment_id, comment.post_id, comment.user_id, comment.parent_id, comment.content, comment.created_at, user.username
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

		const topLevelComments = commentsByParentId[null] || [];

		topLevelComments.forEach((comment) => {
			comment.replies = commentsByParentId[comment.comment_id] || [];
		});

		// num of total comments
		const totalComments = commentsResult.length;

		return { post, comments: topLevelComments, totalComments };
	} catch (error) {
		console.error("Error retrieving post and comments:", error);
		throw new Error("Database error: Could not retrieve post and comments");
	}
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
