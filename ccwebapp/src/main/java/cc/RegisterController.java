package cc;

/**
 * Created by harryquigley on 30/03/2016.
 */

import cc.Venue;

import java.util.Map;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.ui.Model;

@Controller
public class RegisterController {
    @RequestMapping(value="/register", method=RequestMethod.GET)
    public String registerForm(Model model) {
        model.addAttribute("venue", new Venue());
        return "registration";
    }

    @RequestMapping(value="/register", method=RequestMethod.POST)
    public String venueSubmit(@ModelAttribute Venue venue, Model model) {
        model.addAttribute("venue", venue);
        return "registrationSuccess";
    }


}
