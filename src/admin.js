import express from 'express';
// import { db } from './db.js';
import { showSignatures } from './registration.js';

export const router = express.Router();

function catchErrors(fn) {
    console.log("catching errors");
    return (req, res, next) => fn(req, res, next).catch(next);
  }

async function ensureLoggedIn(req, res) {
    // console.log("ensure logged in", req);
    if (req.isAuthenticated()) {
        let isAdmin = true;
      return await showSignatures(isAdmin);
    //   return res.render('registration', {});
    }
    console.log("not logged in");
    return res.redirect('admin/login');
  
  }

async function login(req, res) {
    console.log("in function login");
    if(req.isAuthenticated()) {
        return res.redirect('/admin');
    }

    let message = '';
    console.log("req session messages", req.session.messages);
    if (req.session.messages && req.session.messages.length > 0) {
            message = req.session.messages.join(', ');
            req.session.messages = [];
          }

    console.log("render login");
    res.render('login', {message});

  }

router.get('/', catchErrors(ensureLoggedIn));
router.get('/login', catchErrors(login));