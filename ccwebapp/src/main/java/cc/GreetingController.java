package cc;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
class GreetingController {

    @RequestMapping("/")
    public String greeting() {
        return "greeting";
    }
}