package crowdcontrol;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;

@RestController
public class Cc_controller {

    @RequestMapping("/hello")
    public String index() {
        return "Greetings from Spring Boot!";
    }

}