import express, { Router } from "express";
import Auth0Strategy from "passport-auth0";
import passport from "passport";
import { prisma } from "./index";
import { UserType } from "@prisma/client";
import { nextTick } from "process";

const strategy = new Auth0Strategy(
    {
        domain: process.env.AUTH0_DOMAIN!,
        clientID: process.env.AUTH0_CLIENT_ID!,
        clientSecret: process.env.AUTH0_CLIENT_SECRET!,
        callbackURL: process.env.AUTH0_CALLBACK_URL!,
    },
    (accessToken, refreshToken, params, profile, cb) => {
        if (profile.emails === undefined) return cb("No email found");

        prisma.user.findFirst({ where: { email: profile.emails[0].value } }).then((user) => {
            if (user) return cb(null, user);
            if (profile.emails === undefined) return cb("No email found");

            prisma.user
                .create({
                    data: {
                        name: profile.displayName,
                        email: profile.emails[0].value,
                        type: UserType.TESTER,
                    },
                })
                .then((user) => {
                    return cb(null, user);
                });
        });
    }
);

passport.use(strategy);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user: Express.User, done) => done(null, user));

const router = Router();

router.get("/login", passport.authenticate("auth0", { scope: ["openid", "email", "profile"] }));

router.get(
    "/callback",
    passport.authenticate("auth0", { failureRedirect: "/failure" }),
    (req, res, next) => {
        // res.redirect("/home");
        // res.send("Hello");
        // res.redirect("/app");
        // console.log(req);
        res.redirect("http://localhost:8080/home");
    }
);

export default router;

let _get_route = express().get("", (req, res, next) => {});

type get_route_type = Parameters<typeof _get_route>;

export function secured(req: get_route_type[0], res: get_route_type[1], next: get_route_type[2]) {
    if (req.user || req.isAuthenticated()) {
        return next();
    } else {
        req.session.returnTo = req.originalUrl;
        res.redirect("/login");
        // next();
    }
}
