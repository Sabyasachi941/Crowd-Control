package cc;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;

@Entity
public class Venue {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private long id;

    private boolean capacity;

    public boolean getCapacity() {
        return capacity;
    }

    public void setCapacity_warning(boolean capacity_warning) {
        this.capacity = capacity;
    }

}


