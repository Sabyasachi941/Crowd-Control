package cc;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
/**
 * Created by harryquigley on 08/04/2016.
 */
@Controller
public class PortalController {
    @RequestMapping(value="/portal")
    public String portal() {
        return "portal";
    }
}
